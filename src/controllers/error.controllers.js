const logger = require('../api/logger');

const { NODE_ENV } = process.env;

module.exports = (err, req, res, next) => {
  if (NODE_ENV === 'development') {
    logger.debug(`${err.name}\n${err.stack}`);
    res.status(err.statusCode || 500).json({ message: err.message });
  } else if (NODE_ENV === 'test') {
    logger.debug(`${err.name}\n${err.stack}`);
    res.status(err.isOperational ? err.statusCode : 500).json({
      message: err.isOperational ? err.message : 'Something went wrong, please try again later',
    });
  } else {
    res.status(err.isOperational ? err.statusCode : 500).json({
      message: err.isOperational ? err.message : 'Something went wrong, please try again later',
    });
  }
};
