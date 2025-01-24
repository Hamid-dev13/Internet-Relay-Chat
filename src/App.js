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
    <div className="bg-gradient-to-b from-gray-100 to-gray-200 min-h-screen flex flex-col items-center justify-center p-6 text-gray-800">
      <div className="flex w-full max-w-6xl justify-between items-start">
        {/* Section de chat */}
        <div className="flex flex-col items-center w-3/4">
          <h1 className="text-4xl font-bold mb-8">💬 Chat WebSocket</h1>
  
          {!isNameSet ? (
            <div className="flex flex-col items-center space-y-4">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Entrez votre pseudo"
                className="w-80 p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-300"
              />
              <button
                onClick={handleUserName}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
              >
                Confirmer le pseudo
              </button>
            </div>
          ) : (
            <>
              {isInRoom && (
                <div className="bg-white rounded-lg shadow p-4 mb-6 w-full max-w-lg">
                  <h3 className="text-lg font-semibold mb-2">
                    Utilisateurs connectés dans <span className="text-blue-500">{roomName}</span> :
                  </h3>
                  <div className="space-y-1">
                    {usersConnected.map((user, index) => (
                      <p key={index} className="flex items-center">
                        <span className="mr-2">👤</span> {user}
                      </p>
                    ))}
                  </div>
                </div>
              )}
  
              {showRoomList && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
                    <button
                      onClick={() => setShowRoomList(false)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                      ✖
                    </button>
                    <h3 className="text-lg font-semibold mb-4">Liste des salons</h3>
                    <ul className="space-y-2">
                      {roomList.length > 0 ? (
                        roomList.map((room, index) => (
                          <li key={index} className="text-gray-600">
                            {room}
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-400">Aucun salon rejoint.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
  
              {!isInRoom ? (
                <div className="flex flex-col items-center space-y-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tapez /createRoom <nom> ou /joinRoom <nom>"
                    className="w-80 p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-300"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                  >
                    Envoyer
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg shadow p-4 mb-6 w-full max-w-lg h-64 overflow-y-auto">
                    {chat.map((msg, index) => (
                      <p key={index} className="text-gray-600">
                        <strong className="text-gray-800">{msg.userName}:</strong> {msg.message}
                      </p>
                    ))}
                  </div>
  
                  <div className="flex flex-col items-center space-y-4">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tapez votre message"
                      className="w-80 p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-300"
                    />
                    <button
                      onClick={sendMessage}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                    >
                      Envoyer
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
  
        {/* Section des instructions à droite */}
        <div className="w-1/4 p-6 bg-blue-50 rounded-lg shadow-lg ml-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Bienvenue sur IRC Chat! 👋</h2>
          <p className="text-gray-700 mb-4">Vous pouvez discuter avec vos amis ou des inconnus partout dans le monde ! Voici quelques commandes utiles :</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><span className="font-bold text-blue-500">/createRoom &lt;nom&gt;</span> : Crée un nouveau salon 🛠️</li>
            <li><span className="font-bold text-blue-500">/joinRoom &lt;nom&gt;</span> : Rejoindre un salon 🎉</li>
            <li><span className="font-bold text-blue-500">/roomList</span> : Voir la liste des salons 🏠</li>
            <li><span className="font-bold text-blue-500">/msg </span> : Envoyer un message privé dans le salon 💌</li>
            <li><span className="font-bold text-blue-500">/changePseudo &lt;pseudo&gt; </span> : Changer son pseudo</li>
            <li><span className="font-bold text-blue-500">/leaveRoom &lt;room&gt; </span> : quitter la room</li>
            <li><span className="font-bold text-blue-500">/deleteRoom &lt;room&gt; </span> : quitter la room</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;