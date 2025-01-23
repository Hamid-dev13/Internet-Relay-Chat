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



  io.on("connection", (socket) => {
    console.log("Un utilisateur est connecté :", socket.id);

    // Lorsque l'utilisateur se connecte, il doit choisir un pseudo
    socket.on("choosePseudo", (pseudo) => {
      userNames[socket.id] = pseudo;  // Enregistrer le pseudo
      users[pseudo] = socket;  // Ajouter l'utilisateur à la liste globale

      // Émettre l'événement pour notifier le frontend que le pseudo a été choisi
      io.to(socket.id).emit("updatePseudo", pseudo);
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

    // Création d'une room
    socket.on("createRoom", (room) => {
      socket.join(room);
      console.log(`L'utilisateur ${socket.id} a créé la room ${room}`);

      if (!rooms[room]) {
        rooms[room] = [];
      }
      rooms[room].push(socket.id);

      // Envoi de la liste des utilisateurs présents dans la room après la création
      const usersInRoom = rooms[room].map(id => userNames[id] || id);  // Utilise le pseudo ou l'ID si pas de pseudo
      io.to(room).emit("updateUserList", usersInRoom);

      socket.emit("message", `Bienvenue dans la room ${room}`);
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

    // Rejoindre une room
    socket.on("joinRoom", (data) => {
      const { room, userName } = data;  // Récupérer directement les infos dans la data
    
      console.log(`Reçu joinRoom: ${room} et userName: ${userName}`);
    
      if (!rooms[room]) {
        rooms[room] = [];
      }
      rooms[room].push(socket.id);  // Ajouter l'ID de la socket dans la room
      socket.join(room);
    
      // Crée un tableau des pseudos des utilisateurs dans la room
      const usersInRoom = rooms[room].map((id) => userNames[id] || id);
    
      // Log des utilisateurs dans la room
      console.log("Utilisateurs dans la room avant envoi:", usersInRoom);
    
      // Émet la liste des utilisateurs dans la room
      io.to(room).emit("usersConnected", usersInRoom);
    });
    

    // Récupérer la liste des utilisateurs dans une room
    socket.on('getUsers', (roomName) => {
      if (rooms[roomName]) {
        const usersInRoom = rooms[roomName].map(id => {
          return userNames[id] || id;
        });
        io.to(socket.id).emit('usersList', usersInRoom);
      } else {
        io.to(socket.id).emit('usersList', []); // Si la room n'existe pas
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

    // Envoi de message privé
    socket.on("privateMessage", (data) => {
      const { toUser, message, fromUser } = data;
    
      console.log("Tentative d'envoi d'un message privé de", fromUser, "à", toUser);
    
      // Vérifier si le destinataire est en ligne
      const recipientSocket = users[toUser];
    
      if (recipientSocket) {
        recipientSocket.emit("message", {
          userName: fromUser,
          message: `Message privé: ${message}`,
        });

        socket.emit("message", {
          userName: "System",
          message: `Votre message privé a été envoyé à ${toUser}.`,
        });
      } else {
        socket.emit("message", {
          userName: "System",
          message: `L'utilisateur ${toUser} n'est pas connecté.`,
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
