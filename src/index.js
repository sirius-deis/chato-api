require('dotenv').config();
const app = require('./app');
const chalk = require('chalk');

const { PORT = 3000 } = process.env;

const server = app.listen(PORT, () => {
    console.log(
        chalk.green.bold('SERVER STATUS: '),
        chalk.green(`Server us running on port: ${PORT}`)
    );
});

process.on('unhandledRejection', err => {
    console.log(
        chalk.red.bold('SERVER STATUS'),
        chalk.red(`Unhandled rejection!`),
        chalk.red.italic(err.name, err.message)
    );
    server.close(() => {
        process.exit(1);
    });
});
