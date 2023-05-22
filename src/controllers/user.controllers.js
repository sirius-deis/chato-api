const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { comparePasswords } = require('../utils/validator');

const User = require('../models/user.models');

const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

const signToken = userId => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const sendResponseWithJwtToken = (res, statusCode, data, userId) => {
    const token = signToken(userId);
    res.cookie('token', token, {
        expires: new Date(
            Date.now() + parseInt(JWT_EXPIRES_IN) * 1000 * 60 * 60 * 24
        ),
    });
    res.status(statusCode).json(data);
};

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

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    const { errors } = validationResult(req);
    if (errors.length) {
        const errorsArr = errors.map(
            error =>
                `${error.msg}. Field '${error.path}' with value '${error.value}' is incorrect`
        );
        return next(new AppError(errorsArr, 400));
    }

    const user = await User.scope('withPassword').findOne({
        where: { email },
    });

    if (!user || (await !user.validatePassword(password))) {
        return next(new AppError('Wrong email or password', 400));
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
        user.id
    );
});
