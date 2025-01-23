import React, { useEffect, useState } from "react";
import socket from "./socket"; // Assurez-vous que ce fichier initialise correctement la connexion WebSocket

const App = () => {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [userName, setUserName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [usersConnected, setUsersConnected] = useState([]); 

  useEffect(() => {
    // Gestion des messages entrants
    socket.on("message", (data) => {
      setChat((prevChat) => [...prevChat, data]);
    });
    socket.on("usersConnected", (users) => {
      setUsersConnected(users);
    });
    socket.on("roomCreated", (room) => {
      // Quand une room est créée, mettre à jour la liste des utilisateurs
      setRoomName(room);
      setIsInRoom(true);
      setChat((prevChat) => [
        ...prevChat,
        { userName: "System", message: `La room '${room}' a été créée et vous y êtes !` },
      ]);
    });
    return () => {
      socket.off("message");
      socket.off("usersConnected");
      socket.off("roomCreated");
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    if (message.startsWith("/createRoom")) {
      const room = message.split(" ")[1];
      if (room) {
        socket.emit("createRoom", room);
        // Les autres utilisateurs devraient être informés de la création de la room
        setChat((prevChat) => [
          ...prevChat,
          { userName: "System", message: `Vous avez créé la room '${room}' !` },
        ]);
        setMessage("");
      } else {
        alert("Erreur : veuillez spécifier un nom pour la room.");
      }
    } else if (message.startsWith("/joinRoom")) {
      const room = message.split(" ")[1];
      if (room) {
        socket.emit("joinRoom", room);
        setRoomName(room);
        setIsInRoom(true);
        setChat((prevChat) => [
          ...prevChat,
          { userName: "System", message: `Vous avez rejoint la room '${room}' !` },
        ]);
        setMessage("");
      } else {
        alert("Erreur : veuillez spécifier une room à rejoindre.");
      }
    } else if (isInRoom) {
      // Envoi de message dans la room
      socket.emit("sendMessage", { room: roomName, message, userName });
      setMessage("");
    } else {
      alert("Veuillez rejoindre une room avant d'envoyer un message.");
    }
  };

  const handleUserName = () => {
    if (userName.trim()) {
      setIsNameSet(true);
      socket.emit("setUserName", userName); // Envoie le pseudo au serveur
    } else {
      alert("Veuillez entrer un pseudo valide.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>💬 Chat WebSocket</h1>

      {!isNameSet ? (
        // Étape pour définir le pseudo
        <div>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Entrez votre pseudo"
            style={{ width: "80%", marginRight: "10px" }}
          />
          <button onClick={handleUserName}>Confirmer le pseudo</button>
        </div>
      ) : (
        <>
          {/* Liste des utilisateurs connectés */}
          {isInRoom && (
            <div>
              <h3>Utilisateurs connectés dans {roomName} :</h3>
              <div
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  height: "150px",
                  overflowY: "scroll",
                  marginBottom: "20px",
                }}
              >
                {usersConnected.map((user, index) => (
                  <p key={index}>👤 {user}</p>
                ))}
              </div>
            </div>
          )}

          {/* Affichage de la room ou options de création/rejoindre */}
          {!isInRoom ? (
            <div>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tapez /createRoom <nom> ou /joinRoom <nom>"
                style={{ width: "80%", marginRight: "10px" }}
              />
              <button onClick={sendMessage}>Envoyer</button>
            </div>
          ) : (
            <>
              {/* Historique des messages */}
              <div
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  height: "300px",
                  overflowY: "scroll",
                  marginBottom: "20px",
                }}
              >
                {chat.map((msg, index) => (
                  <p key={index}>
                    <strong>{msg.userName}:</strong> {msg.message}
                  </p>
                ))}
              </div>

              {/* Envoi d'un message */}
              <div>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tapez un message..."
                  style={{ width: "80%", marginRight: "10px" }}
                />
                <button onClick={sendMessage}>Envoyer</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};


export default App;
