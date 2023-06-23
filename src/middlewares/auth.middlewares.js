const jwt = require('jsonwebtoken');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { getValue } = require('../db/redis.config');

const User = require('../models/user.models');

const { JWT_SECRET } = process.env;

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.match(/Bearer (.*)$/)[1];

  if (!token) {
    return next(new AppError('Sign in before accessing this route', 401));
  }

  let payload;

  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return next(new AppError('Token verification failed. Token is malformed', 401));
  }

  if (payload.iat * 1000 < global.serverStartedAt.getTime()) {
    return next(new AppError('Please login again', 400));
  }

  const isTokenInBlackList = await getValue(`bl-${token}`);

  if (isTokenInBlackList) {
    return next(new AppError('Token is invalid. Please login again', 400));
  }

  const user = await User.scope('withPassword').findByPk(payload.userId);

  if (!user) {
    return next(new AppError("User wasn't found. Please try to login again", 404));
  }

  if (payload.iat * 1000 < user.dataValues.passwordChangedAt) {
    return next(new AppError('Password was changed. Please login again', 401));
  }

  if (!user.dataValues.isActive) {
    return next(
      new AppError(
        'Your account is deactivated. Please reactivate your account and then try again',
        403,
      ),
    );
  }

  req.user = user;
  req.exp = payload.exp;
  req.token = token;

  next();
});

exports.inAuthorized = (...roles) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  catchAsync(async (req, res, next) => {
    const { user } = req;
    if (!user) {
      return next(new AppError("User wasn't found. Please try to login again", 404));
    }
    if (!roles.includes(user.dataValues.role)) {
      return next(new AppError("You don'\t have permission to access this route", 403));
    }

    next();
  });
