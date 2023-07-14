const { Server } = require('socket.io');
const Conversation = require('../models/conversation.models');

const auth = require('./auth');

const listOfUsers = new Map();

module.exports = (server) => {
  const io = new Server(server);

  io.use(auth);

  io.on('connection', (socket) => {
    const { user } = socket;
    listOfUsers.set(user.id, socket);
    socket.broadcast.emit('online', user.id);

    socket.on('client_message', ({ message, conversationId, receiverId }) => {
      if (user.dataValues.id.toString() === receiverId) {
        const err = new Error('');
        err.data = { type: '' };
      }
      socket.emit('server_message', { senderId: null });
    });

    socket.on('disconnect', () => {
      socket.broadcast.emit('offline', listOfUsers.get(user.id));
      listOfUsers.delete(user.id);
    });

    socket.on('connect_error', (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
  });
};
