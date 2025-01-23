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
    // Gestion des messages généraux
    socket.on("message", (data) => {
        setChat((prevChat) => [...prevChat, data]);
    });

    // Gestion des messages privés
    socket.on("privateMessage", (data) => {
        const { from, to, message, isPrivate, isFromRecipient } = data;

        if (isPrivate) {
            if (isFromRecipient) {
                // Message reçu d'un autre utilisateur
                console.log(`Message reçu de ${from}: ${message}`);
                setChat((prevChat) => [
                    ...prevChat,
                    { 
                        userName: `[PRIVÉ] ${from}`, 
                        message 
                    }
                ]);
            } else {
                // Message envoyé par moi
                console.log(`Message envoyé à ${to}: ${message}`);
                setChat((prevChat) => [
                    ...prevChat,
                    { 
                        userName: `[PRIV (${from})]`, 
                        message 
                    }
                ]);
            }
        }
    });

    // Gestion des utilisateurs connectés
    socket.on("usersConnected", (users) => {
        setUsersConnected(users);
        console.log("Utilisateurs connectés:", users);
    });

    // Gestion des rooms créées
    socket.on("roomCreated", (room) => {
        setRoomName(room);
        setIsInRoom(true);
        setChat((prevChat) => [
            ...prevChat,
            { 
                userName: "System", 
                message: `La room '${room}' a été créée et vous y êtes !` 
            },
        ]);
    });

    // Nettoyage des événements pour éviter des abonnements multiples
    return () => {
        socket.off("message");
        socket.off("privateMessage");
        socket.off("usersConnected");
        socket.off("roomCreated");
    };
}, []);

const sendMessage = () => {
    if (!message.trim()) return;

    if (message.startsWith("/msg")) {
        const [, toUser, ...privateMessageParts] = message.split(" ");
        const privateMessage = privateMessageParts.join(" ");
        if (toUser && privateMessage) {
          // Vérification des valeurs avant envoi
          console.log(`Envoi du message à ${toUser}: ${privateMessage}`);
      
          // Envoi du message privé
          socket.emit("privateMessage", {
              toUser,
              message: privateMessage,
              fromUser: userName
          });
      
          // Ajouter immédiatement dans l'UI
          setChat((prevChat) => [
              ...prevChat,
              { 
                  userName: `[PRIV (${toUser})]`,  // Vérification que toUser est bien défini
                  message: privateMessage
              }
          ]);
          setMessage(""); // Effacer le champ du message après envoi
      } else {
          alert("Utilisation : /msg pseudo message");
      }
      
        return;
    }

    if (message.startsWith("/createRoom")) {
        const room = message.split(" ")[1];
        if (room) {
            socket.emit("createRoom", room);
            setChat((prevChat) => [
                ...prevChat,
                { 
                    userName: "System", 
                    message: `Vous avez créé la room '${room}' !` 
                },
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
                { 
                    userName: "System", 
                    message: `Vous avez rejoint la room '${room}' !` 
                },
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
      // Envoie du pseudo au serveur via 'choosePseudo'
      socket.emit("choosePseudo", userName);
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
              <div>
  
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
