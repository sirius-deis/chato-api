const AppError = function (message, code) {
  Error.prototype.constructor.call(this, message);
  this.name = this.constructor.name;
  this.message = message;
  this.statusCode = code;
  this.isOperational = true;
  Error.captureStackTrace(this, this.constructor);
};

AppError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: AppError,
    enumerable: false,
    configurable: true,
    writable: true,
  },
});

module.exports = AppError;
