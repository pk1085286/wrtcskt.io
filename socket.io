const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle incoming socket connections
io.on('connection', (socket) => {
  console.log('a user connected');

  // Generate a unique room ID for the user
  const roomId = uuidv4();

  // Send the room ID back to the user
  socket.emit('room-id', roomId);

  // Handle when a user joins a room
  socket.on('join-room', (roomId) => {
    console.log(`user joined room ${roomId}`);

    // Join the room
    socket.join(roomId);

    // Broadcast to all other users in the room that a new user has joined
    socket.to(roomId).emit('user-joined', socket.id);

    // Handle when a user sends a message
    socket.on('message', (message) => {
      console.log(`message received in room ${roomId}: ${message}`);

      // Broadcast the message to all other users in the room
      socket.to(roomId).emit('message', message);
    });

    // Handle when a user leaves the room
    socket.on('disconnect', () => {
      console.log(`user left room ${roomId}`);

      // Broadcast to all other users in the room that a user has left
      socket.to(roomId).emit('user-left', socket.id);
    });
  });
});

// Start the server
http.listen(3000, () => {
  console.log('listening on *:3000');
});
