const jwt = require('jsonwebtoken');
const User = require('../models/user.models');

const { JWT_SECRET } = process.env;

module.exports = async (socket, next) => {
  const token = socket.handshake.headers.authentication?.match(/Bearer (.*)$/)[1];

  if (!token) {
    const err = new Error('Authentication error');
    err.data = { type: 'authentication_error' };
    socket.disconnect();
    return next(err);
  }
  let payload;
  try {
    payload = await jwt.verify(token, JWT_SECRET);
  } catch {
    const err = new Error('Token verification error');
    err.data = { type: 'token_verification_error' };
    return next(err);
  }
  const user = await User.findByPk(payload.userId);
  if (!user) {
    const err = new Error('User not found error');
    err.data = { type: 'user_not_found_error' };
    return next(err);
  }
  socket.user = user;
  next();
};
