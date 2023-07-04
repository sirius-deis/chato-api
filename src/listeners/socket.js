const { Server } = require('socket.io');

const auth = require('./auth');

const listOfUsers = new Map();

module.exports = (server) => {
  const io = new Server(server);

  io.use(auth);

  io.on('connection', (socket) => {
    const { user } = socket;
    listOfUsers.set(user._id, socket);
    socket.on('disconnect', () => {
      listOfUsers.delete(user._id);
    });
  });
};
