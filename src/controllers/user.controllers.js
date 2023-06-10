const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { arePasswordsTheSame } = require('../utils/validator');
const sendMail = require('../api/email');
const { sequelize } = require('../db/db.config');

const User = require('../models/user.models');
const ActivateToken = require('../models/activateToken.models');
const ResetToken = require('../models/resetToken.models');
const BlockList = require('../models/blockList.models');

// eslint-disable-next-line object-curly-newline
const { MODE, PORT, JWT_SECRET, JWT_EXPIRES_IN } = process.env;

const signToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const sendResponseWithJwtToken = (res, statusCode, data, userId) => {
  const token = signToken(userId);
  res.cookie('token', token, {
    expires: new Date(Date.now() + parseInt(JWT_EXPIRES_IN, 10) * 1000 * 60 * 60 * 24),
  });
  res.status(statusCode).json(data);
};

const createToken = () => {
  const hash = crypto.randomBytes(32).toString('hex');
  return hash;
};

const buildLink = (req, token, route) => {
  const link = `${req.protocol}://${req.hostname}${MODE === 'development' ? `:${PORT}` : ''}${
    req.baseUrl
  }/${route}/${token}`;
  return link;
};

const filterFieldsForUpdating = (fields) => {
  const map = {};
  let isInserted = false;
  // eslint-disable-next-line no-restricted-syntax
  for (const field in fields) {
    if (fields[field]) {
      map[field] = fields[field];
      isInserted = true;
    }
  }

  return isInserted && map;
};

exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm } = req.body;

  if (!arePasswordsTheSame(password, passwordConfirm)) {
    return next(new AppError('Password are not the same. Please provide correct passwords', 400));
  }
  let link;
  await sequelize.transaction(async () => {
    const user = await User.create({ email, password });
    const token = createToken();

    await ActivateToken.create({ token, user_id: user.id });

    link = buildLink(req, token, 'activate');
  });

  await sendMail(email, 'Activate your Chato account', 'verification', {
    title: 'Please activate your account',
    link,
    email,
  });

  res.status(201).json({
    message:
      'Your account was created successfully. Please check your email and confirm your account, and then you will be able to use our service',
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email },
  });

  if (!user || !(await user.validatePassword(password))) {
    return next(new AppError('Wrong email or password', 400));
  }

  if (!user.dataValues.isActive) {
    return next(new AppError('Your account is deactivated. Please reactivate your account and then try again', 403));
  }

  user.password = undefined;

  sendResponseWithJwtToken(
    res,
    200,
    {
      message: 'You were logged in successfully',
      date: {
        user,
      },
    },
    user.id,
  );
});

exports.activate = catchAsync(async (req, res, next) => {
  const { activateToken } = req.params;
  const token = await ActivateToken.findOne({
    where: { token: activateToken },
  });

  if (!token.dataValues.token) {
    return next(new AppError('Token is not exist. Please check if it is correct', 400));
  }

  const user = await User.scope('withIsActive').findByPk(token.dataValues.user_id);

  if (!user) {
    return next(new AppError('Token is invalid. Please try again', 400));
  }

  await user.update({ isActive: true });
  await token.destroy();

  res.status(200).json({
    message: 'Your account was successfully verified. Please login and enjoy chatting',
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId } = req.params;

  if (user.dataValues.id === userId) {
    return res.status(200).json({
      message: 'Data was retrieved successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          bio: user.bio,
        },
      },
    });
  }

  const retrievedUser = await User.findByPk(userId);
  if (!retrievedUser) {
    return next(new AppError('There is no user with such id', 404));
  }

  res.status(200).json({
    message: 'Data was retrieved successfully',
    data: {
      user: {
        id: retrievedUser.id,
        email: retrievedUser.email,
        firstName: retrievedUser.firstName,
        bio: retrievedUser.bio,
      },
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { firstName, lastName, bio } = req.body;

  const fieldsToInsert = filterFieldsForUpdating({
    firstName,
    lastName,
    bio,
  });

  if (!fieldsToInsert) {
    return next(new AppError('Please provide some information to change', 400));
  }

  await user.update(fieldsToInsert);

  res.status(200).json({
    message: 'Your data was updated successfully',
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { password, passwordConfirm, currentPassword } = req.body;

  if (!(await user.validatePassword(currentPassword))) {
    return next(new AppError('Incorrect password', 403));
  }

  if (password === currentPassword) {
    return next(new AppError("New password can't be the same as the current one", 400));
  }

  if (!arePasswordsTheSame(password, passwordConfirm)) {
    return next(new AppError('Password are different', 400));
  }

  user.password = password;

  await user.save();

  sendResponseWithJwtToken(
    res,
    200,
    {
      message: 'You password was successfully updated',
    },
    user.id,
  );
});

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return next(new AppError('There is not user with such email', 400));
  }

  const token = createToken();
  await ResetToken.create({ token, userId: user.id });

  const link = buildLink(req, token, 'reset-password');
  await sendMail(user.email, 'Reset password', 'reset', { title: 'Reset your password', link });

  res.status(200).json({
    message: 'Reset token was sent to your email. Check it and follow instructions inside it',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken } = req.params;
  const { password, passwordConfirm } = req.body;
  const token = await ResetToken.findOne({ where: { token: resetToken } });

  if (!token) {
    return next(new AppError('Token is not exist. Please check if it is correct', 400));
  }

  const user = await User.findByPk(token.userId);

  if (!user) {
    return next(new AppError('Token is invalid. Please try again', 400));
  }

  if (!arePasswordsTheSame(password, passwordConfirm)) {
    return next(new AppError('Passwords are different', 400));
  }

  user.password = password;
  await user.save();
  await token.destroy();

  sendResponseWithJwtToken(
    res,
    200,
    {
      message: 'You password was successfully restored',
    },
    user.id,
  );
});

exports.logout = catchAsync(async (req, res) => {
  res.clearCookie('token');
  res.status(204).send();
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { password } = req.body;

  if (!(await user.validatePassword(password))) {
    return next(new AppError('Incorrect password', 400));
  }

  await user.destroy();

  res.clearCookie('token');

  res.status(204).send();
});

exports.deactivate = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { password } = req.body;

  if (!(await user.validatePassword(password))) {
    return next(new AppError('Incorrect password', 400));
  }

  user.set({ isActive: false });

  await user.save();

  res.clearCookie('token');

  res.status(204).send();
});

exports.blockUser = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId } = req.params;
  if (user.dataValues.id === userId) {
    return next(new AppError("You can't block yourself", 400));
  }
  const userToBlock = await User.findByPk(userId);

  if (!userToBlock) {
    return next(new AppError('There is no user with such id', 404));
  }

  const blockList = await BlockList.findOne({ user_id: user.dataValues.id });

  if (!blockList) {
    await BlockList.create({ user_id: user.dataValues.id, blocked_users: [userId] });
  } else {
    if (blockList.blocked_users.includes(userId)) {
      return next(new AppError('User with such id is already blocked', 400));
    }
    blockList.blocked_users.push(userId);
    await blockList.save();
  }

  res.status(201).json({ message: 'Selected user was blocked successfully' });
});

exports.unblockUser = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId } = req.params;
  if (user.dataValues.id === userId) {
    return next(new AppError("You can't block yourself", 400));
  }
  const userToUnblock = await User.findByPk(userId);
  if (!userToUnblock) {
    return next(new AppError('There is no user with such id', 404));
  }

  const blockList = await BlockList.findOne({ user_id: user.dataValues.id });
  if (!blockList) {
    return next(new AppError('There is user is not blocked', 400));
  }

  if (!blockList.blocked_users.includes(userId)) {
    return next(new AppError('There is user is not blocked', 400));
  }

  blockList.blocked_users = blockList.blocked_users.filter((blockedId) => blockedId !== userId);
  await blockList.save();

  res.status(204).send();
});

exports.blockAccount catchAsync(async (req, res, next) => {});

exports.unblockAccount catchAsync(async (req, res, next) => {});

//TODO: report
