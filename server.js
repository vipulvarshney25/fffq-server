import express from "express";
import http from "http";
import { Server } from "socket.io";

// Full question pool
const quizQuestions = [
  { question: "What does a firewall do?", options: ["Monitors and controls network traffic", "Encrypts emails", "Stores passwords", "Detects malware"], answer: 0 },
  { question: "Which is a strong password practice?", options: ["Using 'password' as your password", "Using a mix of letters, numbers, and symbols", "Sharing passwords with colleagues", "Using only your birthdate"], answer: 1 },
  { question: "What is phishing?", options: ["A type of malware", "Tricking people to reveal sensitive info", "Encrypting data", "Backing up files"], answer: 1 },
  { question: "What does HTTPS signify?", options: ["Website is secure with encryption", "Website is down", "Website is free", "Website is slow"], answer: 0 },
  { question: "Multi-factor authentication requires:", options: ["Password only", "Phone only", "At least two verification methods", "Username only"], answer: 2 },
  { question: "VPN stands for:", options: ["Virtual Personal Network", "Voice Protocol Network", "Virtual Private Network", "Verified Private Network"], answer: 2 },
  { question: "Sensitive data should be:", options: ["Shared freely", "Stored on public websites", "Encrypted", "Deleted immediately"], answer: 2 },
  { question: "Which is NOT a common cyber attack?", options: ["Ransomware", "Phishing", "Decryption", "Denial of Service"], answer: 2 },
  { question: "What is the main function of antivirus software?", options: ["Provide free internet", "Block pop-up ads", "Detect and remove malware", "Increase device speed"], answer: 2 },
  { question: "What does 'malware' stand for?", options: ["Malicious software", "Machine learning ware", "Majorly aware", "Mail warning"], answer: 0 },
  { question: "Which is an example of social engineering?", options: ["SQL Injection", "Phishing email", "Phishing attack", "Man-in-the-middle attack"], answer: 2 },
  { question: "A computer virus is:", options: ["A hardware component", "A type of malware that replicates by attaching to files", "A password manager", "A web browser"], answer: 1 },
  { question: "Which of these is a security risk of using public Wi-Fi?", options: ["Faster speeds", "Unencrypted data can be intercepted", "Better video quality", "Battery drain"], answer: 1 },
  { question: "What is a strong security practice for emails?", options: ["Click all links to check content", "Open attachments from strangers", "Verify sender before clicking links", "Use 'password123' as password"], answer: 2 },
  { question: "Which is used to uniquely identify a user on a system?", options: ["MAC address", "Username", "Monitor type", "Serial cable"], answer: 1 },
  { question: "Which is a secure way to store passwords?", options: ["Write on sticky notes", "Save in password manager", "Send to friends", "Post on social media"], answer: 1 },
  { question: "What is 'ransomware'?", options: ["A type of data backup", "Malware that locks files and demands payment", "Password hacking tool", "Search engine"], answer: 1 },
  { question: "The most secure way to access your bank is:", options: ["Using public Wi-Fi", "Via HTTPS on a private device", "Through emailed bank links", "On someone else's laptop"], answer: 1 },
  { question: "What is a DDoS attack?", options: ["Data theft", "Overloading a service with traffic", "Hacking passwords", "Deleting files"], answer: 1 },
  { question: "What does 'encryption' do?", options: ["Locks data", "Changes data to unreadable format", "Deletes data", "Duplicates data"], answer: 1 },
  { question: "What is 'two-factor authentication'?", options: ["Two passwords", "Password and verification code", "Using two devices", "One-time password"], answer: 1 },
  { question: "Which device monitors and filters incoming network traffic?", options: ["Firewall", "Router", "Modem", "Switch"], answer: 0 },
  { question: "What does 'VPN' protect?", options: ["Data privacy", "Device speed", "Battery life", "Wi-Fi signal"], answer: 0 },
  { question: "Which is NOT a strong password?", options: ["abc123", "P@ssW0rd!", "Complex phrase", "Random characters"], answer: 0 },
  { question: "What does 'phishing' target?", options: ["Passwords", "Emails", "Sensitive personal info", "Software"], answer: 2 },
  { question: "How often should you update your software?", options: ["Never", "Monthly", "Only when problems occur", "Regularly when updates are available"], answer: 3 },
  { question: "What is 'social engineering'?", options: ["Technical hacking", "Tricking people to share info", "Encrypting data", "Stealing hardware"], answer: 1 },
  { question: "What is the best practice for secure web browsing?", options: ["Use HTTP", "Click any link", "Verify HTTPS connection", "Disable antivirus"], answer: 2 },
  { question: "What is a common sign of a phishing email?", options: ["Unexpected attachments", "Good grammar", "Company logo", "Personalized greeting"], answer: 0 },
  { question: "Which is best to protect your phone?", options: ["Antivirus app", "No password", "Public Wi-Fi", "USB charging"], answer: 0 }
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const rooms = {};

function get10RandomQuestions() {
  let selectedIndexes = [];
  while (selectedIndexes.length < 10) {
    let randomIndex = Math.floor(Math.random() * quizQuestions.length);
    if (!selectedIndexes.includes(randomIndex)) {
      selectedIndexes.push(randomIndex);
    }
  }
  return selectedIndexes.map(i => quizQuestions[i]);
}

app.get("/", (req, res) => {
  res.send("FFFQ multiplayer backend is running ✅");
});

io.on("connection", (socket) => {
  socket.on("joinGame", ({ roomCode, playerName }) => {
    if (!roomCode || !playerName) return;

    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: {},
        questionSet: [],
        currentQuestion: 0,
        started: false
      };
    }

    rooms[roomCode].players[socket.id] = { name: playerName, score: 0, answered: false };
    socket.join(roomCode);

    io.to(roomCode).emit("playersUpdate", Object.values(rooms[roomCode].players));
  });

  socket.on("startGame", (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.started) return;

    room.started = true;
    room.questionSet = get10RandomQuestions();
    room.currentQuestion = 0;
    sendQuestion(roomCode);
  });

  socket.on("submitAnswer", ({ roomCode, correct }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player || player.answered) return;

    player.answered = true;
    if (correct) player.score += 10;

    const allAnswered = Object.values(room.players).every(p => p.answered);
    io.to(roomCode).emit("playersUpdate", Object.values(room.players));
    if (allAnswered) {
      setTimeout(() => sendQuestion(roomCode), 1200);
    }
  });

  socket.on("disconnect", () => {
    for (const [roomCode, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(roomCode).emit("playersUpdate", Object.values(room.players));
      }
    }
  });
});

function sendQuestion(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  for (const id in room.players) {
    room.players[id].answered = false;
  }

  if (room.currentQuestion >= room.questionSet.length) {
    const players = Object.values(room.players);
    const winner = players.sort((a, b) => b.score - a.score)[0];
    io.to(roomCode).emit("gameOver", { winner, results: players });
    room.started = false;
    return;
  }

  const q = room.questionSet[room.currentQuestion];
  io.to(roomCode).emit("newQuestion", {
    question: q.question,
    options: q.options,
    answer: q.answer,
    index: room.currentQuestion + 1
  });

  room.currentQuestion++;
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
