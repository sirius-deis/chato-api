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
  unblockUser,
  blockAccount,
  unblockAccount,
  report,
} = require('../controllers/user.controllers');
const conversationRouter = require('./conversation.routes');
const { isEmail, isWithLength, isNotEmpty } = require('../utils/validator');
const { isLoggedIn, inAuthorized } = require('../middlewares/auth.middlewares');
const validationMiddleware = require('../middlewares/validation.middlewares');

const userRouter = express.Router();

userRouter.use('/:receiverId/conversations/', conversationRouter);

userRouter.post(
  '/signup',
  isEmail(),
  isNotEmpty({ field: 'password' }),
  isNotEmpty({ field: 'passwordConfirm' }),
  isWithLength({ field: 'password' }),
  isWithLength({ field: 'passwordConfirm' }),
  validationMiddleware,
  signup,
);

userRouter.get('/activate/:activateToken', activate);

userRouter.post(
  '/login',
  isEmail(),
  isNotEmpty({ field: 'password' }),
  isWithLength({ field: 'password' }),
  validationMiddleware,
  login,
);

userRouter.post('/forget-password', isEmail(), validationMiddleware, forgetPassword);

userRouter.patch(
  '/reset-password/:resetToken',
  isNotEmpty({ field: 'password' }),
  isNotEmpty({ field: 'passwordConfirm' }),
  isWithLength({ field: 'password' }),
  isWithLength({ field: 'passwordConfirm' }),
  validationMiddleware,
  resetPassword,
);

userRouter.use(isLoggedIn);

userRouter.get('/logout', logout);

userRouter.get('/:userId', getUser);

userRouter.post('/block/:userId').post(blockUser);
userRouter.post('/unblock/:userId').delete(unblockUser);

userRouter
  .route('/update')
  .patch(
    isNotEmpty({ field: 'firstName', isOptional: true }),
    isNotEmpty({ field: 'lastName', isOptional: true }),
    isNotEmpty({ field: 'bio', isOptional: true }),
    isWithLength({ field: 'firstName', isOptional: true }),
    isWithLength({ field: 'lastName', isOptional: true }),
    isWithLength({ field: 'bio', isOptional: true, min: 1, max: 256 }),
    validationMiddleware,
    updateMe,
  );

userRouter.post(
  '/update-password',
  isNotEmpty({ field: 'password' }),
  isNotEmpty({ field: 'passwordConfirm' }),
  isNotEmpty({ field: 'currentPassword' }),
  isWithLength({ field: 'password' }),
  isWithLength({ field: 'passwordConfirm' }),
  isWithLength({ field: 'currentPassword' }),
  validationMiddleware,
  updatePassword,
);

userRouter.post(
  '/delete',
  isNotEmpty({ field: 'password' }),
  isWithLength({ field: 'password' }),
  validationMiddleware,
  deleteMe,
);

userRouter.post(
  '/deactivate',
  isNotEmpty({ field: 'password' }),
  isWithLength({ field: 'password' }),
  validationMiddleware,
  deactivate,
);

userRouter.post('/report/:userId', report);

userRouter.post('/block-account/:userId').post(inAuthorized('admin', 'moderator'), blockAccount);
userRouter.post('/unblock-account/:userId').delete(inAuthorized('admin'), unblockAccount);

module.exports = userRouter;
