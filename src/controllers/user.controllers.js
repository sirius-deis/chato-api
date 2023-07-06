const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { arePasswordsTheSame } = require('../utils/validator');
const sendMail = require('../api/email');
const { sequelize } = require('../db/db.config');
const { setValue } = require('../db/redis.config');
const { resizeAndSave } = require('../api/file');

const User = require('../models/user.models');
const ActivateToken = require('../models/activateToken.models');
const ResetToken = require('../models/resetToken.models');

// eslint-disable-next-line object-curly-newline
const { MODE, PORT, JWT_SECRET, JWT_EXPIRES_IN } = process.env;

const signToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const sendResponseWithJwtToken = (res, statusCode, data, userId) => {
  const token = signToken(userId);
  res.status(statusCode).json({ ...data, token });
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

const addTokenToBlackList = async (token, exp) => {
  const tokenExpiresIn = (new Date(exp * 1000) - new Date()) / 1000;
  await setValue(`bl-${token}`, token, tokenExpiresIn);
};

exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm } = req.body;

  if (!arePasswordsTheSame(password, passwordConfirm)) {
    return next(new AppError('Password are not the same. Please provide correct passwords', 400));
  }
  let link;
  await sequelize.transaction(async () => {
    const user = await User.create({ email, password, isActive: true });
    const token = createToken();

    await ActivateToken.create({ token, userId: user.id });

    link = buildLink(req, token, 'activate');
  });

  res.status(201).json({
    message:
      'Your account was created successfully. Please check your email and confirm your account, and then you will be able to use our service',
  });

  sendMail(email, 'Activate your ChattyPal account', 'verification', {
    title: 'Please activate your account',
    link,
    email,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email },
    attributes: { exclude: ['createdAt', 'updatedAt', 'lastSeen'] },
  });

  if (!user || !(await user.validatePassword(password))) {
    return next(new AppError('Wrong email or password', 401));
  }

  if (!user.dataValues.isActive) {
    return next(
      new AppError(
        'Your account is deactivated. Please reactivate your account and then try again',
        403,
      ),
    );
  }

  if (user.dataValues.isBlocked) {
    return next(new AppError('Your account is blocked', 401));
  }

  user.password = undefined;

  sendResponseWithJwtToken(
    res,
    200,
    {
      message: 'You were logged in successfully',
      data: {
        user: { ...user.dataValues, isBlocked: undefined, passwordChangedAt: undefined },
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

  if (!token?.dataValues.token) {
    return next(new AppError('Token does not exist. Please check if it is correct', 404));
  }

  const user = await User.scope('withIsActive').findByPk(token.dataValues.userId);

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

  if (user.dataValues.id.toString() === userId) {
    return res.status(200).json({
      message: 'Data was retrieved successfully',
      data: {
        user: {
          id: user.dataValues.id,
          phone: user.dataValues.phone,
          email: user.dataValues.email,
          firstName: user.dataValues.firstName,
          lastName: user.dataValues.lastName,
          bio: user.dataValues.bio,
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
        id: retrievedUser.dataValues.id,
        firstName: retrievedUser.dataValues.firstName,
        bio: retrievedUser.dataValues.bio,
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
    return next(new AppError('Incorrect password', 401));
  }

  if (password === currentPassword) {
    return next(new AppError("New password can't be the same as the current one", 400));
  }

  if (!arePasswordsTheSame(password, passwordConfirm)) {
    return next(new AppError('Passwords are different', 400));
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
    return next(new AppError('There is not user with such email', 404));
  }

  const token = createToken();
  await ResetToken.create({ token, userId: user.dataValues.id });

  const link = buildLink(req, token, 'reset-password');

  res.status(200).json({
    message: 'Reset token was sent to your email. Check it and follow instructions inside it',
  });
  sendMail(user.email, 'Reset password', 'reset', { title: 'Reset your password', link });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken } = req.params;
  const { password, passwordConfirm } = req.body;
  const token = await ResetToken.findOne({ where: { token: resetToken } });

  if (!token) {
    return next(new AppError('Token is not exist. Please check if it is correct', 404));
  }

  const user = await User.scope('withPassword').findByPk(token.dataValues.userId);

  if (!user) {
    return next(new AppError('There is no user for such token', 400));
  }

  if (await user.validatePassword(password)) {
    return next(new AppError("New password can't be the same as previous", 400));
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
  const { exp, token } = req;
  await addTokenToBlackList(token, exp);
  res.status(204).send();
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { password } = req.body;

  if (!(await user.validatePassword(password))) {
    return next(new AppError('Incorrect password', 401));
  }

  await user.destroy();

  res.status(204).send();
});

exports.deactivate = catchAsync(async (req, res, next) => {
  const { user, exp, token } = req;
  const { password } = req.body;

  if (!(await user.validatePassword(password))) {
    return next(new AppError('Incorrect password', 401));
  }

  user.set({ isActive: false });

  await user.save();

  await addTokenToBlackList(token, exp);

  res.status(204).send();
});

exports.blockUser = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userIdToBlock } = req.params;
  if (user.dataValues.id.toString() === userIdToBlock) {
    return next(new AppError("You can't block yourself", 400));
  }
  const userToBlock = await User.findByPk(userIdToBlock);

  if (!userToBlock) {
    return next(new AppError('There is no user with such id', 404));
  }

  const blockList = await user.getBlocker();

  if (blockList.find((blockedUser) => blockedUser.dataValues.id.toString() === userIdToBlock)) {
    return next(new AppError('User with such id is already blocked', 400));
  }
  await user.addBlocker(userIdToBlock);

  res.status(200).json({ message: 'User was blocked successfully' });
});

exports.unblockUser = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId: userIdToBlock } = req.params;
  if (user.dataValues.id.toString() === userIdToBlock) {
    return next(new AppError("You can't block yourself", 400));
  }

  const userToBlock = await User.findByPk(userIdToBlock);

  if (!userToBlock) {
    return next(new AppError('There is no user with such id', 404));
  }

  const blockList = await user.getBlocker();

  if (!blockList.find((blockedUser) => blockedUser.dataValues.id.toString() === userIdToBlock)) {
    return next(new AppError('This user is not blocked', 400));
  }

  user.removeBlocker(userIdToBlock);

  await user.save();

  res.status(200).json({ message: 'User was unblocked successfully' });
});

exports.blockAccount = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const userToBlock = await User.findByPk(userId);
  if (!userToBlock) {
    return next(new AppError('There is no user with such id', 404));
  }
  userToBlock.dataValues.isBlocked = true;
  await userToBlock.save();
  res.status(200).json({ message: 'User account was blocked successfully' });
});

exports.unblockAccount = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const userToUnblock = await User.findByPk(userId);
  if (!userToUnblock) {
    return next(new AppError('There is no user with such id', 404));
  }
  userToUnblock.dataValues.isBlocked = false;
  await userToUnblock.save();
  res.status(200).json({ message: 'User account was unblocked successfully' });
});

exports.report = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { userId } = req.params;

  if (user.dataValues.id.toString() === userId) {
    return next(new AppError("You can't report your account", 400));
  }

  const userToReport = await User.findByPk(userId);

  if (!userToReport) {
    return next(new AppError('There is no user with such id', 404));
  }

  userToReport.dataValues.isReported = true;
  await userToReport.save();

  res.status(200).json({ message: 'User account was reported successfully' });
});

//TODO: add cloud storage
exports.addProfilePhoto = catchAsync(async (req, res, next) => {
  const { user, file } = req;
  const { buffer, originalName } = file;
  const timestamp = new Date().toISOString();
  const fileName = `${timestamp}-${originalName}`;
  const filePath = `${__dirname}/${fileName}`;
  await resizeAndSave(buffer, { width: 100, height: 100 }, 'jpeg', filePath);
  res.status(200).json({ message: 'Photo was added successfully' });
});

exports.deleteProfilePhoto = catchAsync(async (req, res, next) => {
  res.status(200).json({ message: 'Photo was deleted successfully' });
});
