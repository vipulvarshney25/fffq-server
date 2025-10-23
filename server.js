// server.js — Fastest Finger First Multiplayer Backend
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const rooms = {}; // Each room stores its players, questions, and state

// Basic route for testing deployment
app.get("/", (req, res) => {
  res.send("FFFQ multiplayer backend is running ✅");
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // A player joins a room
  socket.on("joinGame", ({ roomCode, playerName }) => {
    if (!roomCode || !playerName) return;

    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: {},
        currentQuestion: 0,
        started: false,
      };
    }

    rooms[roomCode].players[socket.id] = {
      name: playerName,
      score: 0,
      answered: false,
    };
    socket.join(roomCode);

    console.log(`${playerName} joined room ${roomCode}`);
    io.to(roomCode).emit("playersUpdate", Object.values(rooms[roomCode].players));
  });

  // The host starts the game
  socket.on("startGame", (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.started) return;
    room.started = true;
    room.currentQuestion = 0;
    sendQuestion(roomCode);
  });

  // Player submits answer
  socket.on("submitAnswer", ({ roomCode, correct }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[socket.id];
    if (!player || player.answered) return;

    player.answered = true;
    if (correct) player.score += 10;

    const allAnswered = Object.values(room.players).every((p) => p.answered);
    if (allAnswered) {
      setTimeout(() => sendQuestion(roomCode), 1000);
    }

    io.to(roomCode).emit("playersUpdate", Object.values(room.players));
  });

  // Disconnect
  socket.on("disconnect", () => {
    for (const [roomCode, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        console.log(`${room.players[socket.id].name} left ${roomCode}`);
        delete room.players[socket.id];
        io.to(roomCode).emit("playersUpdate", Object.values(room.players));
      }
    }
  });
});

// Simple example question set
const quizQuestions = [
  { question: "What does HTTPS mean?", options: ["Secure Protocol", "HyperText Transfer Protocol Secure"], answer: 1 },
  { question: "What is phishing?", options: ["Tricking users into revealing information", "A fishing game"], answer: 0 },
  { question: "VPN stands for?", options: ["Virtual Private Network", "Verified Personal Network"], answer: 0 },
];

// Send next question or results
function sendQuestion(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  for (const id in room.players) {
    room.players[id].answered = false;
  }

  if (room.currentQuestion >= quizQuestions.length) {
    // Game over
    const players = Object.values(room.players);
    const winner = players.sort((a, b) => b.score - a.score)[0];
    io.to(roomCode).emit("gameOver", {
      winner,
      results: players,
    });
    room.started = false;
    return;
  }

  const q = quizQuestions[room.currentQuestion];
  io.to(roomCode).emit("newQuestion", {
    question: q.question,
    options: q.options,
    index: room.currentQuestion + 1,
  });

  room.currentQuestion++;
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
