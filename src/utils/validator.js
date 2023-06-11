const { body } = require('express-validator');

// eslint-disable-next-line newline-per-chained-call
exports.isEmail = () => body('email').trim().isEmail().withMessage('Provide valid email').escape();
exports.isNotEmptyWithLength = ({ field, min = 4, max }) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`Field: ${field} can't be empty`)
    .isLength({ min, max: max ?? undefined })
    .withMessage(`Field: ${field} can't be shorter than ${min} length${max ? ` and longer than ${max} length` : ''}`)
    .escape();

exports.arePasswordsTheSame = (password1, password2) => password1 === password2;
