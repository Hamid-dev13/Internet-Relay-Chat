const { Server } = require("socket.io");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // Frontend URL
      methods: ["GET", "POST"],
    },
  });

  let rooms = {}; // Cette variable stocke les utilisateurs par room
  let userNames = {}; // Cette variable stocke les pseudos des utilisateurs (par socket.id)

  io.on("connection", (socket) => {
    console.log("Un utilisateur est connecté :", socket.id);

    // Lorsque l'utilisateur se connecte, il doit choisir un pseudo
    socket.on("choosePseudo", (pseudo) => {
      userNames[socket.id] = pseudo;  // Enregistrer le pseudo dans userNames

      // Émettre l'événement pour notifier le frontend que le pseudo a été choisi
      io.to(socket.id).emit("updatePseudo", pseudo);
      console.log(`L'utilisateur ${socket.id} a choisi le pseudo ${pseudo}`);
    });

    // Écoute pour la création d'une room
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
      userNames[socket.id] = newPseudo;  // Met à jour le pseudo dans userNames

      // Émettre l'événement pour notifier le frontend que le pseudo a changé
      io.to(socket.id).emit("updatePseudo", newPseudo);

      if (socket.roomName) {
        io.to(socket.roomName).emit("message", {
          userName: "System",
          message: `${userNames[socket.id]} a changé son pseudo en ${newPseudo}!`,
        });
      }
    });

    // Écoute pour rejoindre une room
    socket.on("joinRoom", (room) => {
      socket.join(room);
      console.log(`L'utilisateur ${socket.id} a rejoint la room ${room}`);

      if (!rooms[room]) {
        rooms[room] = [];
      }
      rooms[room].push(socket.id);

      // Envoi de la liste des utilisateurs présents dans la room après avoir rejoint
      const usersInRoom = rooms[room].map(id => userNames[id] || id);  // Utilise le pseudo ou l'ID si pas de pseudo
      io.to(room).emit("updateUserList", usersInRoom);

      socket.emit("message", `Bienvenue dans la room ${room}`);
    });

    // Écoute pour les messages
    socket.on("sendMessage", (data) => {
      console.log(data);
      io.to(data.room).emit("message", {
        userName: data.userName,
        message: data.message,
      });
    });

    // Écoute pour obtenir la liste des utilisateurs dans une room
    socket.on('getUsers', (roomName) => {
      if (rooms[roomName]) {
        const usersInRoom = rooms[roomName].map(id => {
          // Si un pseudo est défini, on l'affiche, sinon on affiche l'ID de socket
          return userNames[id] || id;  // Si userNames[id] est défini, on utilise le pseudo sinon on utilise l'ID
        });
        io.to(roomName).emit('usersList', usersInRoom);
      }
    });

    // Déconnexion : retirer l'utilisateur de la room et des listes
    socket.on("disconnect", () => {
      console.log("Un utilisateur s'est déconnecté :", socket.id);
      for (const room in rooms) {
        rooms[room] = rooms[room].filter((id) => id !== socket.id); // Retirer l'utilisateur de la room
      }
      delete userNames[socket.id]; // Supprimer le pseudo lorsque l'utilisateur se déconnecte
    });
  });

  return io;
};

module.exports = setupSocket;
