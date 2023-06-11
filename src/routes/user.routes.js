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
const { isEmail, isNotEmptyWithLength } = require('../utils/validator');
const { isLoggedIn, inAuthorized } = require('../middlewares/auth.middlewares');
const validationMiddleware = require('../middlewares/validation.middlewares');

const userRouter = express.Router();

userRouter.use('/:receiverId/conversations/', conversationRouter);

userRouter.post(
  '/signup',
  isEmail(),
  isNotEmptyWithLength({ field: 'password' }),
  isNotEmptyWithLength({ field: 'passwordConfirm' }),
  signup,
);

userRouter.get('/activate/:activateToken', activate);

userRouter.post('/login', isEmail(), isNotEmptyWithLength({ field: 'password' }), validationMiddleware, login);

userRouter.post('/forget-password', isEmail(), validationMiddleware, forgetPassword);

userRouter.patch(
  '/reset-password/:resetToken',
  isNotEmptyWithLength({ field: 'password' }),
  isNotEmptyWithLength({ field: 'passwordConfirm' }),
  validationMiddleware,
  resetPassword,
);

userRouter.use(isLoggedIn);

userRouter.get('/logout', logout);

userRouter.get('/:userId').get(getUser);

userRouter.post('/block/:userId').post(blockUser);
userRouter.post('/unblock/:userId').delete(unblockUser);

userRouter
  .route('/update')
  .patch(
    isNotEmptyWithLength({ field: 'firstName' }),
    isNotEmptyWithLength({ field: 'lastName' }),
    isNotEmptyWithLength({ field: 'bio', min: 1, max: 256 }),
    validationMiddleware,
    updateMe,
  );

userRouter.post(
  '/update-password',
  isNotEmptyWithLength({ field: 'password' }),
  isNotEmptyWithLength({ field: 'passwordConfirm' }),
  isNotEmptyWithLength({ field: 'currentPassword' }),
  validationMiddleware,
  updatePassword,
);

userRouter.post('/delete', isNotEmptyWithLength({ field: 'password' }), validationMiddleware, deleteMe);

userRouter.post('/deactivate', isNotEmptyWithLength({ field: 'password' }), validationMiddleware, deactivate);

userRouter.post('/report/:userId', report);

userRouter.post('/block-account/:userId').post(inAuthorized('admin', 'moderator'), blockAccount);
userRouter.post('/unblock-account/:userId').delete(inAuthorized('admin'), unblockAccount);

module.exports = userRouter;
