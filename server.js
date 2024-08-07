const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const messageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('sendMessage', async (msg) => {
    console.log('Message received:', msg);
    const newMessage = new Message(msg);
    await newMessage.save();
    io.to(msg.receiver).emit('receiveMessage', msg); 
    socket.emit('receiveMessage', msg); 
  });

  socket.on('join', (username) => {
    socket.join(username);
    console.log(`${username} joined`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.get('/messages/:sender/:receiver', async (req, res) => {
  const { sender, receiver } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).send('Error fetching messages');
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

