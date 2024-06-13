const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');

// Get all chat messages
router.get('/', async (req, res) => {
  const messages = await ChatMessage.find();
  res.json(messages);
});

// Edit a chat message
router.put('/:id', async (req, res) => {
  const { message } = req.body;
  const updatedMessage = await ChatMessage.findByIdAndUpdate(req.params.id, { message }, { new: true });
  res.json(updatedMessage);
  req.io.emit('messageEdited', updatedMessage);
});

// Delete a chat message
router.delete('/:id', async (req, res) => {
  await ChatMessage.findByIdAndDelete(req.params.id);
  res.json({ success: true });
  req.io.emit('messageDeleted', req.params.id);
});

module.exports = router;
