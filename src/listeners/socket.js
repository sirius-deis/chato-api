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

    socket.on('client_message', ({ message, conversationId, receiverId }) => {
      if (user.dataValues.id.toString() === receiverId) {
        const err = new Error('User not found error');
        err.data = { type: 'user_not_found_error' };
        return next(err);
      }
      socket.emit('server_message', { senderId: null });
    });

    socket.on('disconnect', () => {
      listOfUsers.delete(user.id);
    });

    socket.on('connect_error', (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
  });
};
