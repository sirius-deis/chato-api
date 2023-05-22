const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

const sendResponseWithErrors = (errors, next) => {
    const errorsArr = errors.map(
        error =>
            `${error.msg}. Field '${error.path}' with value '${error.value}' doesn't pass validation`
    );
    next(new AppError(errorsArr, 400));
};

module.exports = (req, res, next) => {
    const { errors } = validationResult(req);
    if (errors.length) {
        sendResponseWithErrors(errors, next);
        return;
    }
    next();
};
