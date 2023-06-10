const express = require('express');

const {
  activate,
  deactivate,
  deleteMe,
  forgetPassword,
  getUser,
  login,
  logout,
  resetPassword,
  signup,
  updateMe,
  updatePassword,
  blockUser,
} = require('../controllers/user.controllers');
const conversationRouter = require('./conversation.routes');
const { isEmail, isNotEmptyWithLength } = require('../utils/validator');
const { isLoggedIn } = require('../middlewares/auth.middlewares');
const validationMiddleware = require('../middlewares/validation.middlewares');

const userRouter = express.Router();

userRouter.use('/:receiverId/conversations/', conversationRouter);

userRouter.post(
  '/signup',
  isEmail(),
  isNotEmptyWithLength('password'),
  isNotEmptyWithLength('passwordConfirm'),
  signup,
);

userRouter.get('/activate/:activateToken', activate);

userRouter.post('/login', isEmail(), isNotEmptyWithLength('password'), validationMiddleware, login);

userRouter.post('/forget-password', isEmail(), validationMiddleware, forgetPassword);

userRouter.patch(
  '/reset-password/:resetToken',
  isNotEmptyWithLength('password'),
  isNotEmptyWithLength('passwordConfirm'),
  validationMiddleware,
  resetPassword,
);

userRouter.use(isLoggedIn);

userRouter.get('/logout', logout);

userRouter.get('/:userId').get(getUser);

userRouter.post('/block/:userId').get(blockUser);

userRouter
  .route('/update')
  .patch(
    isNotEmptyWithLength('firstName'),
    isNotEmptyWithLength('lastName'),
    isNotEmptyWithLength('bio', 1, 256),
    validationMiddleware,
    updateMe,
  );

userRouter.post(
  '/update-password',
  isNotEmptyWithLength('password'),
  isNotEmptyWithLength('passwordConfirm'),
  isNotEmptyWithLength('currentPassword'),
  validationMiddleware,
  updatePassword,
);

userRouter.post('/delete', isNotEmptyWithLength('password'), validationMiddleware, deleteMe);

userRouter.post('/deactivate', isNotEmptyWithLength('password'), validationMiddleware, deactivate);

module.exports = userRouter;
