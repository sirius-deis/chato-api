const chalk = require('chalk');

const { MODE } = process.env;

module.exports = (err, req, res, next) => {
    console.log(
        chalk.bgRedBright.bold('SERVER ERROR'),
        chalk.redBright(`${err.name}\n`),
        chalk.redBright.italic(err.stack)
    );
    if (MODE === 'development') {
        res.status(err.statusCode || 500).json({ message: err.message });
    } else {
        res.status(err.isOperational ? err.statusCode : 500).json({
            message: err.isOperational
                ? err.message
                : 'Something went wrong, please try again later',
        });
    }
};
