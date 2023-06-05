const { body } = require('express-validator');

exports.isEmail = () => body('email').trim().isEmail().escape();
exports.isNotEmptyWithLength = (field, min = 4, max) =>
  body(field)
    .trim()
    .notEmpty()
    .isLength({ min, max: max ?? undefined })
    .escape();

exports.arePasswordsTheSame = (password1, password2) => password1 === password2;
