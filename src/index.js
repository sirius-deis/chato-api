require('dotenv').config();
const app = require('./app');
const chalk = require('chalk');

const { PORT = 3000 } = process.env;

const server = app.listen(PORT, () => {
    console.log(
        chalk.bgGreen.bold('SERVER STATUS: '),
        chalk.whiteBright('Server is running on port:'),
        chalk.green.bold(`${PORT}`)
    );
});

process.on('unhandledRejection', err => {
    console.log(
        chalk.bgRed.bold('SERVER STATUS'),
        chalk.redBright(`UNHANDLED REJECTION!`),
        chalk.redBright.italic(err?.name, err?.stack)
    );
    server.close(() => {
        process.exit(1);
    });
});

process.on('uncaughtException', err => {
    console.log(
        chalk.bgRed.bold('SERVER STATUS'),
        chalk.redBright(`UNCAUGHT EXCEPTION! \n`),
        chalk.redBright.italic(err.stack)
    );
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    console.log(
        chalk.yellowBright.bold('SERVER STATUS'),
        chalk.whiteBright(`SIGTERM RECEIVED!`)
    );
    server.close(() => {
        console.log(
            chalk.bgGreen.bold('SERVER STATUS'),
            chalk.greenBright('Process terminated')
        );
    });
});

process.on('SIGINT', () => {
    console.log(
        chalk.yellowBright.bold('SERVER STATUS'),
        chalk.yellow(`SIGINT RECEIVED!`)
    );
    server.close(() => {
        console.log(
            chalk.bgGreen.bold('SERVER STATUS'),
            chalk.greenBright('Process terminated')
        );
    });
});

process.on('SIGQUIT', () => {
    console.log(
        chalk.yellowBright.bold('SERVER STATUS'),
        chalk.yellow(`SIGQUIT RECEIVED!`)
    );
    server.close(() => {
        console.log(
            chalk.bgGreen.bold('SERVER STATUS'),
            chalk.greenBright('Process terminated')
        );
    });
});
