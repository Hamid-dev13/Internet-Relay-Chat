let rooms = {}; // Liste des rooms et utilisateurs
let userNames = {}; // Liste des utilisateurs par socket.id
let users = {}; // Liste des utilisateurs globaux (par pseudo)
const { Server } = require("socket.io");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // Frontend URL
      methods: ["GET", "POST"],
    },
  });

  // Fonction pour obtenir les utilisateurs dans une room
  const getUsersInRoom = (room) => {
    if (rooms[room]) {
      return rooms[room].map((id) => userNames[id] || id); // Retourne la liste des utilisateurs
    }
    return [];
  };

  io.on("connection", (socket) => {
    console.log("Un utilisateur est connecté :", socket.id);

    // Lorsque l'utilisateur se connecte, il doit choisir un pseudo
    socket.on("choosePseudo", (pseudo) => {
      userNames[socket.id] = pseudo;  // Enregistrer le pseudo
      users[pseudo] = socket;  // Ajouter l'utilisateur à la liste globale
      console.log(`Pseudo enregistré pour ${socket.id}: ${userNames[socket.id]}`);
      // Émettre l'événement pour notifier le frontend que le pseudo a été choisi
      io.emit("usersConnected", Object.values(userNames)); 
      console.log(`L'utilisateur ${socket.id} a choisi le pseudo ${pseudo}`);
    });

    // L'utilisateur quitte une room
    socket.on("leaveRoom", (room) => {
      socket.leave(room);
      console.log(`L'utilisateur ${socket.id} a quitté la room ${room}`);

      if (rooms[room]) {
        // Supprimer l'utilisateur de la liste des membres de la room
        rooms[room] = rooms[room].filter((id) => id !== socket.id);

        // Notifier les autres membres que l'utilisateur a quitté
        io.to(room).emit("message", {
          userName: "System",
          message: `${userNames[socket.id] || socket.id} a quitté le canal.`,
        });

        // Mettre à jour la liste des utilisateurs pour les autres membres
        const usersInRoom = rooms[room].map((id) => userNames[id] || id);
        io.to(room).emit("updateUserList", usersInRoom);

        // Si la room est vide, on peut la supprimer
        if (rooms[room].length === 0) {
          delete rooms[room];
          console.log(`La room ${room} a été supprimée car elle est vide.`);
        }
      }
    });

    // Créer une room
    socket.on('createRoom', (room) => {
      socket.join(room); // Ajoute le créateur de la room
      if (!rooms[room]) {
        rooms[room] = []; // Si la room n'existe pas, on l'initialise
      }
      rooms[room].push(socket.id); // Ajouter le créateur de la room
      io.to(room).emit('roomCreated', room); // Envoie un message à tous les utilisateurs dans la room
      io.to(room).emit('usersConnected', getUsersInRoom(room)); // Met à jour la liste des utilisateurs
    });

    // Rejoindre une room
    socket.on('joinRoom', (room) => {
      socket.join(room);
      if (!rooms[room]) {
        rooms[room] = []; // Si la room n'existe pas, on l'initialise
      }
      rooms[room].push(socket.id); // Ajouter l'utilisateur à la room
      io.to(room).emit('usersConnected', getUsersInRoom(room)); // Met à jour la liste des utilisateurs
    });

    // Changer le pseudo de l'utilisateur
    socket.on("changePseudo", (newPseudo) => {
      const oldPseudo = userNames[socket.id];
      userNames[socket.id] = newPseudo;  // Met à jour le pseudo dans userNames

      // Supprimer l'ancien pseudo de la liste des utilisateurs globaux
      delete users[oldPseudo];

      // Ajouter le nouveau pseudo à la liste des utilisateurs globaux
      users[newPseudo] = socket;

      // Émettre l'événement pour notifier le frontend que le pseudo a changé
      io.to(socket.id).emit("updatePseudo", newPseudo);

      if (socket.roomName) {
        io.to(socket.roomName).emit("message", {
          userName: "System",
          message: `${oldPseudo} a changé son pseudo en ${newPseudo}!`,
        });
      }
    });

    // Envoi de message dans une room
    socket.on("sendMessage", (data) => {
      console.log(data);
      io.to(data.room).emit("message", {
        userName: data.userName,
        message: data.message,
      });
    });

    socket.on("privateMessage", (data) => {
      const { toUser, message, fromUser } = data;
  
      // Validation des données
      if (!toUser || !message || !fromUser) {
          socket.emit("privateMessageStatus", {
              status: "error",
              message: "Données invalides"
          });
          return;
      }
  
      // Normalisation des utilisateurs (pour éviter les problèmes de casse)
      const normalizedToUser = toUser.trim().toLowerCase();
      const normalizedFromUser = fromUser.trim().toLowerCase();
  
      // Empêcher l'auto-envoi
      if (normalizedToUser === normalizedFromUser) {
          socket.emit("privateMessageStatus", {
              status: "error",
              message: "Vous ne pouvez pas envoyer un message à vous-même."
          });
          return;
      }
  
      console.log(`Message privé de ${fromUser} à ${toUser}: ${message}`);
  
      // Trouver le socket du destinataire
      const recipientSocket = users[normalizedToUser];
  
      if (recipientSocket) {
          // Envoyer le message uniquement au destinataire
          recipientSocket.emit("privateMessage", {
              from: fromUser,
              message: message,
              isPrivate: true
          });
  
          // Confirmer à l'expéditeur que le message a bien été envoyé
          socket.emit("privateMessageStatus", {
              to: toUser,
              status: "sent",
              message: `Message envoyé à ${toUser}`
          });
      } else {
          // Informer l'expéditeur que le destinataire est hors ligne
          socket.emit("privateMessageStatus", {
              to: toUser,
              status: "error",
              message: `${toUser} n'est pas en ligne.`
          });
      }
  });
  
  
  
    // Déconnexion : retirer l'utilisateur de la room et des listes
    socket.on("disconnect", () => {
      console.log("Un utilisateur s'est déconnecté :", socket.id);

      // Retirer l'utilisateur de toutes les rooms
      for (const room in rooms) {
        rooms[room] = rooms[room].filter((id) => id !== socket.id); // Retirer l'utilisateur de la room
      }

      // Supprimer le pseudo et l'utilisateur global
      const pseudo = userNames[socket.id];
      if (pseudo) {
        delete users[pseudo];
        delete userNames[socket.id]; // Supprimer le pseudo lorsque l'utilisateur se déconnecte
      }
    });
  });

  return io;
};

module.exports = setupSocket;
