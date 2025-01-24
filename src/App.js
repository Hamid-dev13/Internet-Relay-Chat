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
  const [roomList, setRoomList] = useState([]); // Liste des rooms
  const [showRoomList, setShowRoomList] = useState(false); // Contrôle de l'affichage
  
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
              message,
            },
          ]);
        } else {
          // Message envoyé par moi
          console.log(`Message envoyé à ${to}: ${message}`);
          setChat((prevChat) => [
            ...prevChat,
            {
              userName: `[PRIV (${from})]`,
              message,
            },
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
          message: `La room '${room}' a été créée et vous y êtes !`,
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
  
    // Gestion de la commande /msg pour les messages privés
    if (message.startsWith("/msg")) {
      const [, toUser, ...privateMessageParts] = message.split(" ");
      const privateMessage = privateMessageParts.join(" ");
      if (toUser && privateMessage) {
        console.log(`Envoi du message à ${toUser}: ${privateMessage}`);
  
        socket.emit("privateMessage", {
          toUser,
          message: privateMessage,
          fromUser: userName,
        });
  
        setChat((prevChat) => [
          ...prevChat,
          {
            userName: `[PRIV (${toUser})]`,
            message: privateMessage,
          },
        ]);
        setMessage("");
      } else {
        alert("Utilisation : /msg pseudo message");
      }
      return;
    }
    if (message.startsWith("/createRoom")) {
      const room = message.split(" ")[1]; // Récupère le nom de la room
    
      if (room) {
        // Émet l'événement pour créer la room
        socket.emit("createRoom", room);
    
        // Écoute l'événement 'error' pour détecter si la room existe déjà
        socket.on("error", (data) => {
          alert(data.message); // Affiche un message d'erreur si la room existe déjà
        });
    
        // Écoute l'événement 'roomCreated' et s'assure qu'il ne s'ajoute qu'une seule fois
        socket.once("roomCreated", (room) => {  // Utilisation de `once` pour écouter une seule fois
          setChat((prevChat) => [
            ...prevChat,
            {
              userName: "System",
              message: `Vous avez créé la room '${room}' !`,
            },
          ]);
          setMessage(""); // Vide le champ de message
        });
      } else {
        alert("Erreur : veuillez spécifier un nom pour la room.");
      }
      return;
    }
    
  
    // Gestion de la commande /joinRoom pour rejoindre une room
    if (message.startsWith("/joinRoom")) {
      const room = message.split(" ")[1];
      if (room) {
        socket.emit("joinRoom", room);
        setRoomName(room);
        setIsInRoom(true);
        setChat((prevChat) => [
          ...prevChat,
          {
            userName: "System",
            message: `Vous avez rejoint la room '${room}' !`,
          },
        ]);
        setMessage("");
      } else {
        alert("Erreur : veuillez spécifier une room à rejoindre.");
      }
      return;
    }
    // Commande /deleteRoom pour supprimer une room
    if (message.startsWith("/deleteRoom")) {
      const room = message.split(" ")[1];
      if (room) {
        socket.emit("deleteRoom", room); // Demande au serveur de supprimer la room
        setChat((prevChat) => [
          ...prevChat,
          {
            userName: "System",
            message: `La room '${room}' a été supprimée.`,
          },
        ]);
        setMessage("");
      } else {
        alert("Erreur : veuillez spécifier une room à supprimer.");
      }
      return;
    }
    // Gestion de la commande /leaveRoom pour quitter une room
    if (message.startsWith("/leaveRoom")) {
      if (isInRoom) {
        socket.emit("leaveRoom", roomName);
        setIsInRoom(false);
        setRoomName("");
        setChat((prevChat) => [
          ...prevChat,
          {
            userName: "System",
            message: "Vous avez quitté la room.",
          },
        ]);
        setMessage("");
      } else {
        alert("Vous n'êtes pas dans une room.");
      }
      return;
    }
  
    // Gestion de la commande /changePseudo pour changer de pseudo
    if (message.startsWith("/changePseudo")) {
      const newPseudo = message.split(" ")[1];
      if (newPseudo) {
        socket.emit("changePseudo", { oldPseudo: userName, newPseudo });
        setUserName(newPseudo);
        setChat((prevChat) => [
          ...prevChat,
          {
            userName: "System",
            message: `Votre pseudo a été changé en '${newPseudo}'.`,
          },
        ]);
        setMessage("");
      } else {
        alert("Erreur : veuillez spécifier un nouveau pseudo.");
      }
      return;
    }
    if (message.startsWith("/roomList")) {
      socket.emit("getRoomList", {}, (rooms) => {
        // Recevoir la liste des rooms depuis le serveur
        setRoomList(rooms); // `rooms` est un tableau contenant les noms des rooms
        setShowRoomList(true); // Afficher la fenêtre pop-up
      });
      setMessage("");
      return;
    }
    // Envoi de message standard dans une room
    if (isInRoom) {
      socket.emit("sendMessage", { room: roomName, message, userName });
      setMessage("");
    } else {
      alert("Veuillez rejoindre une room avant d'envoyer un message.");
    }
  };
  
  

  const handleUserName = () => {
    if (userName.trim()) {
      setIsNameSet(true);
      socket.emit("choosePseudo", userName);
    } else {
      alert("Veuillez entrer un pseudo valide.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>💬 Chat WebSocket</h1>

      {!isNameSet ? (
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
{showRoomList && (
  <div className="overlay">
    <div className="popup">
      <button className="closeButton" onClick={() => setShowRoomList(false)}>✖</button>
      <h3>Liste des salons</h3>
      <ul>
        {roomList.length > 0 ? (
          roomList.map((room, index) => <li key={index}>{room}</li>)
        ) : (
          <li>Aucun salon rejoint.</li>
        )}
      </ul>
    </div>
  </div>
)}
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

              <div>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tapez votre message"
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