const express = require('express');

const userController = require('../controllers/user.controllers');
const { isEmail, isNotEmptyWithLength } = require('../utils/validator');

const userRouter = express.Router();

userRouter.post(
    '/signup',
    isEmail(),
    isNotEmptyWithLength('password'),
    isNotEmptyWithLength('passwordConfirm'),
    userController.signup
);

module.exports = userRouter;
