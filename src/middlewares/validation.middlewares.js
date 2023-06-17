const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

const sendResponseWithErrors = (errors, next) => {
  next(new AppError(errors, 400));
};

module.exports = (req, res, next) => {
  const { errors } = validationResult(req);
  if (errors.length) {
    return sendResponseWithErrors(
      errors.map((error) => error.msg),
      next,
    );
  }
  next();
};
