const { body } = require('express-validator');

// eslint-disable-next-line newline-per-chained-call
exports.isEmail = () => body('email').trim().isEmail().withMessage('Provide valid email').escape();

exports.isNotEmpty = ({ field, isOptional = false }) =>
  // eslint-disable-next-line newline-per-chained-call
  body(field).optional(isOptional).trim().notEmpty().withMessage(`Field: ${field} can't be empty`);

exports.isWithLength = ({ field, min = 4, max, isOptional = false }) =>
  body(field)
    .optional(isOptional)
    .isLength({ min, max: max ?? undefined })
    .withMessage(
      `Field: ${field} can't be shorter than ${min} length${
        max ? ` and longer than ${max} length` : ''
      }`,
    )
    .escape();

exports.arePasswordsTheSame = (password1, password2) => password1 === password2;
