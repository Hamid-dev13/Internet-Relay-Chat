import React, { useEffect, useState } from "react";
import socket from "./socket";  // Assure-toi que tu as bien ton fichier socket.js

function App() {
  const [message, setMessage] = useState("");  // Message à envoyer
  const [chat, setChat] = useState([]);  // Liste des messages reçus
  const [roomName, setRoomName] = useState("");  // Room à créer ou rejoindre
  const [isInRoom, setIsInRoom] = useState(false);  // Vérifier si l'utilisateur est dans une room
  const [userName, setUserName] = useState("");  // Pseudo de l'utilisateur
  const [isNameSet, setIsNameSet] = useState(false);  // Vérifier si l'utilisateur a défini un pseudo
  const [users, setUsers] = useState([]);  // Liste des utilisateurs dans la room

  useEffect(() => {
    socket.on("message", (data) => {
      setChat((prevChat) => [...prevChat, data]); // Afficher les messages
    });

    // Ecoute des utilisateurs dans la room
    socket.on("usersList", (usersInRoom) => {
      setUsers(usersInRoom);  // Mettre à jour la liste des utilisateurs
    });

    return () => {
      socket.off("message");
      socket.off("usersList");  // Nettoyage de l'écouteur
    };
  }, []);

  // Fonction pour envoyer un message et gérer les commandes
  const sendMessage = () => {
    if (message.trim() !== "") {
      if (message.startsWith("/createRoom")) {
        const room = message.split(" ")[1];
        if (room) {
          socket.emit("createRoom", room);
          setRoomName(room);
          setIsInRoom(true);
          setChat((prevChat) => [
            ...prevChat,
            { userName: "System", message: `Vous avez créé la room '${room}' !` },
          ]);
          setMessage("");
        } else {
          setChat((prevChat) => [...prevChat, "Erreur: veuillez spécifier un nom de room."]);
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
          socket.emit("getUsers", room); // Demander la liste des utilisateurs
          setMessage("");
        } else {
          setChat((prevChat) => [...prevChat, "Erreur: veuillez spécifier une room à rejoindre."]);
        }
      } else if (message.startsWith("/users")) {
        const room = roomName; // Utilise la room actuelle
        if (room) {
          socket.emit("getUsers", room); // Envoie la requête pour obtenir la liste des utilisateurs
        }
        setMessage("");
      } else {
        if (roomName.trim() !== "") {
          socket.emit("sendMessage", { room: roomName, message, userName });
          setMessage("");
        }
      }
    }
  };

  // Fonction pour définir le pseudo de l'utilisateur
  const setUserNameHandler = () => {
    if (userName.trim() !== "") {
      setIsNameSet(true);  // Le pseudo est défini
    } else {
      alert("Veuillez entrer un pseudo.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>💬 Chat WebSocket</h1>

      {/* Étape pour définir le pseudo */}
      {!isNameSet && (
        <div>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Choisissez un pseudo"
            style={{ width: "80%", marginRight: "10px" }}
          />
          <button onClick={setUserNameHandler}>Définir le pseudo</button>
        </div>
      )}

      {/* Afficher la liste des utilisateurs */}
      {isInRoom && users.length > 0 && (
        <div>
          <h3>Utilisateurs dans la room '{roomName}':</h3>
          <ul>
            {users.map((user, index) => (
              <li key={index}>{user}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Champ pour entrer le nom de la room */}
      {isNameSet && !isInRoom && (
        <div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez /createRoom <nom de la room> ou /joinRoom <nom de la room>"
            style={{ width: "80%", marginRight: "10px" }}
          />
          <button onClick={sendMessage}>Envoyer</button>
        </div>
      )}

      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
          marginBottom: "20px",
        }}
      >
        {chat.map((msg, index) => {
          console.log(msg); // Affiche msg dans la console pour vérifier sa structure
          return (
            <p key={index}>
              <strong>{msg.userName}</strong>: {msg.message}
            </p>
          );
        })}
      </div>

      {/* Input pour envoyer un message lorsque dans une room */}
      {isInRoom && (
        <div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            style={{ width: "80%", marginRight: "10px" }}
          />
          <button onClick={sendMessage}>Envoyer</button>
        </div>
      )}
    </div>
  );
}

export default App;
