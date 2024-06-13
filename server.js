const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const Poll = require('./models/Poll'); // Assuming Poll schema is defined in models/Poll.js
const ChatMessage = require('./models/ChatMessage'); // Assuming ChatMessage schema is defined in models/ChatMessage.js

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('UI'));
app.use(express.json());

mongoose.connect('mongodb+srv://admin:1234@rakesh.7nclgf8.mongodb.net/?retryWrites=true&w=majority&appName=Rakesh', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Poll Routes
app.post('/polls', async (req, res) => {
  const { question, options } = req.body;
  const poll = new Poll({ question, options, votes: Array(options.length).fill(0) });
  await poll.save();
  res.json(poll);
});

app.get('/polls', async (req, res) => {
  const polls = await Poll.find();
  res.json(polls);
});

app.post('/polls/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { optionIndex } = req.body;
  const poll = await Poll.findById(id);
  poll.votes[optionIndex] += 1;
  await poll.save();
  res.json(poll);
  io.emit('pollUpdated', poll); // Broadcast the updated poll
});

// Chat Routes
app.put('/chat/:id', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const chatMessage = await ChatMessage.findById(id);
  chatMessage.message = message;
  await chatMessage.save();
  res.json(chatMessage);
});

app.delete('/chat/:id', async (req, res) => {
  const { id } = req.params;
  await ChatMessage.findByIdAndDelete(id);
  res.sendStatus(204);
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinChat', async (username) => {
    socket.username = username;
    socket.broadcast.emit('userJoined', username);
    const messages = await ChatMessage.find();
    messages.forEach(message => {
      socket.emit('newMessage', message);
    });
  });

  socket.on('sendMessage', async (messageText) => {
    const message = new ChatMessage({ username: socket.username, message: messageText });
    await message.save();
    io.emit('newMessage', message);
  });

  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('typing', { username: socket.username, isTyping });
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      socket.broadcast.emit('userLeft', socket.username);
    }
    console.log('A user disconnected');
  });

  socket.on('voteCast', (poll) => {
    io.emit('pollUpdated', poll); // Broadcast the updated poll
  });

  socket.on('messageUpdated', (updatedMessage) => {
    io.emit('messageUpdated', updatedMessage);
  });

  socket.on('messageDeleted', (messageId) => {
    io.emit('messageDeleted', messageId);
  });
});

server.listen(7080, () => {
  console.log('Server is running on port 3000');
});
