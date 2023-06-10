const { Server } = require('socket.io');

module.exports = (server) => {
  const io = new Server(server);

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
  });
};
