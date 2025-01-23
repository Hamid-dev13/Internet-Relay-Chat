const { Server } = require("socket.io");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // Frontend URL
      methods: ["GET", "POST"],
    },
  });

  const users = {}; // Liste des utilisateurs connectés
  let rooms = {}; // Stocke les utilisateurs par room
  let userNames = {}; // Stocke les pseudos des utilisateurs par socket.id

  io.on("connection", (socket) => {
    console.log("Un utilisateur est connecté :", socket.id);

    // L'utilisateur choisit un pseudo
    socket.on("choosePseudo", (pseudo) => {
      userNames[socket.id] = pseudo; // Enregistre le pseudo
      io.to(socket.id).emit("updatePseudo", pseudo); // Notifie l'utilisateur
      console.log(`L'utilisateur ${socket.id} a choisi le pseudo ${pseudo}`);
    });

    // L'utilisateur quitte une room
    socket.on("leaveRoom", (room) => {
      socket.leave(room);
      console.log(`L'utilisateur ${socket.id} a quitté la room ${room}`);

      if (rooms[room]) {
        rooms[room] = rooms[room].filter((id) => id !== socket.id);
        io.to(room).emit("message", {
          userName: "System",
          message: `${userNames[socket.id] || socket.id} a quitté le canal.`,
        });

        const usersInRoom = rooms[room].map((id) => userNames[id] || id);
        io.to(room).emit("updateUserList", usersInRoom);

        if (rooms[room].length === 0) {
          delete rooms[room];
          console.log(`La room ${room} a été supprimée car elle est vide.`);
        }
      }
    });

    // Ajouter l'utilisateur à la liste
    socket.on("setUserName", (userName) => {
      users[userName] = socket;
      console.log(`${userName} est maintenant connecté`);
    });

    // Création d'une room
    socket.on("createRoom", (room) => {
      socket.join(room);
      console.log(`L'utilisateur ${socket.id} a créé la room ${room}`);

      if (!rooms[room]) {
        rooms[room] = [];
      }
      rooms[room].push(socket.id);

      const usersInRoom = rooms[room].map((id) => userNames[id] || id);
      io.to(room).emit("updateUserList", usersInRoom);
      socket.emit("message", `Bienvenue dans la room ${room}`);
    });

    // Changer le pseudo d'un utilisateur
    socket.on("changePseudo", (newPseudo) => {
      userNames[socket.id] = newPseudo;
      io.to(socket.id).emit("updatePseudo", newPseudo);

      if (socket.roomName) {
        io.to(socket.roomName).emit("message", {
          userName: "System",
          message: `${userNames[socket.id]} a changé son pseudo en ${newPseudo}!`,
        });
      }
    });

    // Rejoindre une room
    socket.on("joinRoom", (room, userName) => {
      console.log("Reçu joinRoom:", room, userName);

      if (!rooms[room]) {
        rooms[room] = [];
      }
      rooms[room].push({ id: socket.id, userName });
      socket.join(room);

      const usersInRoom = rooms[room].map((user) => user.userName);
      console.log("usersInRoom avant envoi:", usersInRoom);

      io.to(room).emit("usersList", usersInRoom);
    });

    // Récupérer la liste des utilisateurs dans une room
    socket.on("getUsers", (roomName) => {
      if (rooms[roomName]) {
        const usersInRoom = rooms[roomName].map(
          (id) => userNames[id] || id
        );
        io.to(socket.id).emit("usersList", usersInRoom);
      } else {
        io.to(socket.id).emit("usersList", []);
      }
    });

    // Envoyer un message dans une room
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
      console.log(
        "Tentative d'envoi d'un message privé de",
        fromUser,
        "à",
        toUser
      );
      console.log("Liste des utilisateurs:", users);

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
        console.log("L'utilisateur", toUser, "n'est pas connecté.");
        socket.emit("message", {
          userName: "System",
          message: `L'utilisateur ${toUser} n'est pas connecté.`,
        });
      }
    });

    // Déconnexion
    socket.on("disconnect", () => {
      console.log("Un utilisateur s'est déconnecté :", socket.id);
      for (const room in rooms) {
        rooms[room] = rooms[room].filter((id) => id !== socket.id);
      }
      delete userNames[socket.id];
    });
  });

  return io;
};

module.exports = setupSocket;
