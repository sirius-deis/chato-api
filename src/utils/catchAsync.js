// eslint-disable-next-line arrow-body-style
module.exports = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      return next(err);
    }
  };
};
