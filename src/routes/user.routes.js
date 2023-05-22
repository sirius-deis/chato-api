const express = require('express');

const userController = require('../controllers/user.controllers');
const { isEmail, isNotEmptyWithLength } = require('../utils/validator');
const { isLoggedIn } = require('../middlewares/auth.middlewares');

const userRouter = express.Router();

userRouter.post(
    '/signup',
    isEmail(),
    isNotEmptyWithLength('password'),
    isNotEmptyWithLength('passwordConfirm'),
    userController.signup
);

userRouter.get('/activate/:activateToken', userController.activate);

userRouter.post(
    '/login',
    isEmail(),
    isNotEmptyWithLength('password'),
    userController.login
);

userRouter.use(isLoggedIn);

userRouter.route('/me').get(userController.me).patch(userController.updateMe);

userRouter.post(
    '/delete',
    isNotEmptyWithLength('password'),
    userController.delete
);

userRouter.post(
    '/deactivate',
    isNotEmptyWithLength('password'),
    userController.deactivate
);

module.exports = userRouter;
