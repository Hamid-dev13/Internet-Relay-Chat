const { Server } = require("socket.io");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // Frontend URL
      methods: ["GET", "POST"],
    },
  });

  let rooms = {}; // Stocke les utilisateurs par room
  let userNames = {}; // Stocke les pseudos des utilisateurs par socket.id

  io.on("connection", (socket) => {
    console.log("Un utilisateur est connecté :", socket.id);

    // L'utilisateur choisit un pseudo
    socket.on("choosePseudo", (pseudo) => {
      userNames[socket.id] = pseudo; // Enregistre le pseudo
      console.log(`L'utilisateur ${socket.id} a choisi le pseudo ${pseudo}`);
    });

    // Rejoindre une room
    socket.on("joinRoom", (room) => {
      console.log("Reçu joinRoom:", room);

      if (!rooms[room]) {
        rooms[room] = [];
      }
      rooms[room].push(socket.id);
      socket.join(room);

      const usersInRoom = rooms[room].map((id) => userNames[id] || id);
      io.to(room).emit("usersList", usersInRoom); // Émission de la mise à jour des utilisateurs dans la room
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

// Exporter en utilisant CommonJS
module.exports = setupSocket;
