const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const roomController = require("./controllers/roomController");
const messageController = require("./controllers/messageController");
 // Import du fichier backend/socket.js


const setupSocket = require("./socket"); // Import du fichier backend/socket.js

// Configuration du serveur
const app = express();
const server = http.createServer(app);
const io = setupSocket(server);

// Routes Express (si besoin)
app.get("/", (req, res) => {
  res.send("Bienvenue sur le serveur WebSocket");
});

// Démarrage du serveur
server.listen(5000, () => {
  console.log("Serveur WebSocket en écoute sur le port 5000");
});
