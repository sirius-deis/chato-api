const { Server } = require('socket.io');

const auth = require('./auth');

const listOfUsers = new Map();

module.exports = (server) => {
  const io = new Server(server);

  io.use(auth);

  io.on('connection', (socket) => {
    const { user } = socket;
    listOfUsers.set(user.id, socket);

    socket.on('message', ({ message, conversationId }) => {});

    socket.on('disconnect', () => {
      listOfUsers.delete(user.id);
    });

    socket.on('connect_error', (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
  });
};
