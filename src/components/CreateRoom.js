// src/CreateRoom.js
import React, { useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000'); // Assurez-vous que c'est bien l'adresse du serveur WebSocket

const CreateRoom = () => {
  const [roomName, setRoomName] = useState('');

  const handleCreateRoom = () => {
    if (roomName) {
      socket.emit('createRoom', roomName); // Événement WebSocket pour créer la room
      console.log(`Salon ${roomName} créé`);
    } else {
      console.log("Le nom de la room ne peut pas être vide");
    }
  };

  return (
    <div>
      <h2>Créer un Salon</h2>
      <input 
        type="text" 
        value={roomName} 
        onChange={(e) => setRoomName(e.target.value)} 
        placeholder="Nom du salon"
      />
      <button onClick={handleCreateRoom}>Créer</button>
    </div>
  );
};

export default CreateRoom;
