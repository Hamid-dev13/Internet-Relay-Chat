// Envoi de message à une room spécifique
module.exports.sendMessage = (socket, roomName, message) => {
    if (message.trim()) {
      // Si le message n'est pas vide, l'envoyer à tous les membres de la room
      io.to(roomName).emit("message", message);
      console.log(`Message envoyé à la room ${roomName}: ${message}`);
    } else {
      // Si le message est vide, ne rien faire
      socket.emit("message", "Le message ne peut pas être vide");
    }
  };
  