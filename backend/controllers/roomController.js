let rooms = {}; // Un objet pour stocker les rooms et leurs utilisateurs

// Créer une room
module.exports.createRoom = (socket, roomName) => {
  if (!rooms[roomName]) {
    rooms[roomName] = [];  // Si la room n'existe pas, on la crée
    console.log(`Room créée: ${roomName}`);
  }

  // Ajouter le socket (utilisateur) à la room
  socket.join(roomName);
  socket.emit("message", `Bienvenue dans la room ${roomName}`);
  io.to(roomName).emit("message", `${socket.id} a rejoint la room ${roomName}`);
};

// Rejoindre une room
module.exports.joinRoom = (socket, roomName) => {
  if (rooms[roomName]) {
    // Si la room existe, ajouter l'utilisateur
    socket.join(roomName);
    socket.emit("message", `Vous avez rejoint la room ${roomName}`);
    io.to(roomName).emit("message", `${socket.id} a rejoint la room ${roomName}`);
  } else {
    // Si la room n'existe pas, envoyer un message d'erreur
    socket.emit("message", `La room ${roomName} n'existe pas`);
  }
};
