const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { comparePasswords } = require('../utils/validator');

const User = require('../models/user.models');

exports.signup = catchAsync(async (req, res, next) => {
    const { email, password, passwordConfirm } = req.body;
    const { errors } = validationResult(req);
    if (errors.length) {
        const errorsArr = errors.map(
            error =>
                `${error.msg}. Field '${error.path}' with value '${error.value}' is incorrect`
        );
        return next(new AppError(errorsArr, 400));
    }

    if (!comparePasswords(password, passwordConfirm)) {
        return next(
            new AppError(
                'Password are not the same. Please provide correct passwords',
                400
            )
        );
    }

    await User.create({ email, password });

    res.status(201).json({
        message:
            'Your account was created successfully. Please login to continue',
    });
});

exports.login = catchAsync((req, res, next) => {});
