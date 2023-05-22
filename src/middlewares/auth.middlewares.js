const jwt = require('jsonwebtoken');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const User = require('../models/user.models');

const { JWT_SECRET } = process.env;

exports.isLoggedIn = catchAsync(async (req, res, next) => {
    const { token } = req.cookies;
    if (!token) {
        next(new AppError('Sign in before accessing this route', 401));
    }

    const payload = jwt.verify(token, JWT_SECRET);

    if (!payload) {
        return next(new AppError('Token verification failed', 401));
    }

    const user = await User.findByPk(payload.userId);

    if (!user) {
        return next(
            new AppError("User wasn't found. Please try to login again", 404)
        );
    }

    req.user = user;

    next();
});
