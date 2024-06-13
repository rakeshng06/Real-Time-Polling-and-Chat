const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');

// Get all polls
router.get('/', async (req, res) => {
  const polls = await Poll.find();
  res.json(polls);
});

// Create a new poll
router.post('/', async (req, res) => {
  const newPoll = new Poll(req.body);
  await newPoll.save();
  res.status(201).json(newPoll);
});

// Vote on a poll
router.post('/:id/vote', async (req, res) => {
  const poll = await Poll.findById(req.params.id);
  const { optionIndex } = req.body;
  poll.votes[optionIndex] += 1;
  await poll.save();
  res.json(poll);
});

module.exports = router;
