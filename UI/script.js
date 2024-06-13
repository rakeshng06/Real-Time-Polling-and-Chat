document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const pollList = document.getElementById('pollList');
  const createPollButton = document.getElementById('createPollButton');
  const pollQuestion = document.getElementById('pollQuestion');
  const pollOptions = document.getElementById('pollOptions');

  const chatBox = document.getElementById('chatBox');
  const sendButton = document.getElementById('sendButton');
  const messageInput = document.getElementById('messageInput');
  const typingIndicator = document.getElementById('typingIndicator');

  const muteButton = document.getElementById('muteButton');
  let isMuted = false;

  muteButton.addEventListener('click', () => {
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  });

  createPollButton.addEventListener('click', async () => {
    const question = pollQuestion.value;
    const options = pollOptions.value.split(',').map(option => option.trim());
    
    if (question && options.length > 0) {
      const response = await fetch('/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question, options })
      });
      const poll = await response.json();
      renderPoll(poll);
    }
  });

  sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message) {
      socket.emit('sendMessage', message);
      messageInput.value = '';
    }
  });

  messageInput.addEventListener('input', () => {
    socket.emit('typing', messageInput.value.length > 0);
  });

  socket.on('newMessage', message => {
    addMessageToUI(message);
  });

  socket.on('messageUpdated', message => {
    const messageElement = document.getElementById(message._id);
    if (messageElement) {
      messageElement.querySelector('.message-text').textContent = message.message;
    }
  });

  socket.on('messageDeleted', messageId => {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.remove();
    }
  });

  socket.on('typing', ({ username, isTyping }) => {
    typingIndicator.textContent = isTyping ? `${username} is typing...` : '';
  });

  socket.on('userJoined', username => {
    if (!isMuted) {
      alert(`${username} joined the chat`);
    }
  });

  socket.on('userLeft', username => {
    if (!isMuted) {
      alert(`${username} left the chat`);
    }
  });

  socket.on('pollUpdated', poll => {
    updatePoll(poll);
  });

  async function loadPolls() {
    const response = await fetch('/polls');
    const polls = await response.json();
    polls.forEach(renderPoll);
  }

  function renderPoll(poll) {
    const pollElement = document.createElement('div');
    pollElement.className = 'poll';
    pollElement.id = poll._id;
    const pollQuestion = document.createElement('h3');
    pollQuestion.textContent = poll.question;
    pollElement.appendChild(pollQuestion);

    poll.options.forEach((option, index) => {
      const optionElement = document.createElement('button');
      optionElement.textContent = `${option} (${poll.votes[index]})`;
      optionElement.addEventListener('click', async () => {
        const response = await fetch(`/polls/${poll._id}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ optionIndex: index })
        });
        const updatedPoll = await response.json();
        socket.emit('voteCast', updatedPoll);
      });
      pollElement.appendChild(optionElement);
    });

    pollList.appendChild(pollElement);
  }

  function updatePoll(updatedPoll) {
    const pollElement = document.getElementById(updatedPoll._id);
    if (pollElement) {
      const buttons = pollElement.querySelectorAll('button');
      updatedPoll.options.forEach((option, index) => {
        buttons[index].textContent = `${option} (${updatedPoll.votes[index]})`;
      });
    }
  }

  function addMessageToUI(message) {
    const messageElement = document.createElement('div');
    messageElement.id = message._id;
    messageElement.className = 'message';

    const messageText = document.createElement('span');
    messageText.className = 'message-text';
    messageText.textContent = `${message.username}: ${message.message}`;

    const updateButton = document.createElement('button');
    updateButton.className = 'update';
    updateButton.textContent = 'Update';
    updateButton.onclick = () => updateMessage(message._id);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete';
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => deleteMessage(message._id);

    messageElement.appendChild(messageText);
    messageElement.appendChild(updateButton);
    messageElement.appendChild(deleteButton);

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  async function updateMessage(messageId) {
    const newMessage = prompt('Enter the new message:');
    if (newMessage) {
      const response = await fetch(`/chat/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newMessage })
      });
      const updatedMessage = await response.json();
      socket.emit('messageUpdated', updatedMessage);
    }
  }

  async function deleteMessage(messageId) {
    const response = await fetch(`/chat/${messageId}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      socket.emit('messageDeleted', messageId);
    }
  }

  // Prompt the user for a username and join the chat
  const username = prompt('Enter your username');
  if (username) {
    socket.emit('joinChat', username);
  }

  loadPolls();
});
