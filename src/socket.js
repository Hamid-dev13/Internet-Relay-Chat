import { io } from "socket.io-client";

// Connexion au serveur WebSocket
const socket = io("http://localhost:5000", {
  transports: ["websocket"], // Optionnel : force le transport WebSocket
});

export default socket;
