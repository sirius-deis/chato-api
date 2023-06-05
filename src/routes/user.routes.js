const express = require('express');

const userController = require('../controllers/user.controllers');
const { isEmail, isNotEmptyWithLength } = require('../utils/validator');
const { isLoggedIn } = require('../middlewares/auth.middlewares');
const validationMiddleware = require('../middlewares/validation.middlewares');

const userRouter = express.Router();

userRouter.post(
  '/signup',
  isEmail(),
  isNotEmptyWithLength('password'),
  isNotEmptyWithLength('passwordConfirm'),
  userController.signup,
);

userRouter.get('/activate/:activateToken', userController.activate);

userRouter.post('/login', isEmail(), isNotEmptyWithLength('password'), validationMiddleware, userController.login);

userRouter.post('/forget-password', isEmail(), validationMiddleware, userController.forgetPassword);

userRouter.patch(
  '/reset-password/:resetToken',
  isNotEmptyWithLength('password'),
  isNotEmptyWithLength('passwordConfirm'),
  validationMiddleware,
  userController.resetPassword,
);

userRouter.use(isLoggedIn);

userRouter.get('/logout', userController.logout);

userRouter
  .route('/me')
  .get(userController.me)
  .patch(
    isNotEmptyWithLength('firstName'),
    isNotEmptyWithLength('lastName'),
    isNotEmptyWithLength('bio', 1, 256),
    validationMiddleware,
    userController.updateMe,
  );

userRouter.post(
  '/update-password',
  isNotEmptyWithLength('password'),
  isNotEmptyWithLength('passwordConfirm'),
  isNotEmptyWithLength('currentPassword'),
  validationMiddleware,
  userController.updatePassword,
);

userRouter.post('/delete', isNotEmptyWithLength('password'), validationMiddleware, userController.delete);

userRouter.post('/deactivate', isNotEmptyWithLength('password'), validationMiddleware, userController.deactivate);

module.exports = userRouter;
