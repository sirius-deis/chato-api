require('dotenv').config();
const chalk = require('chalk');
const app = require('./app');
const { sequelize } = require('./db/db.config');
require('./associations');

const { PORT = 3000 } = process.env;

let server;

const connect = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      chalk.bgGreenBright.bold('DB STATUS'),
      chalk.bgGreenBright.bold('DB STATUS'),
      chalk.greenBright('Connection has been established successfully.'),
    );
  } catch (err) {
    console.error(
      chalk.bgRedBright.bold('DB STATUS'),
      chalk.redBright('Unable to connect to the database:\n'),
      chalk.redBright.italic(err),
    );
  }
};

const sync = async () => {
  await sequelize.sync({ force: false });
  console.log(chalk.bgGreenBright.bold('DB STATUS'), chalk.greenBright('All models were synchronized successfully.'));
};

const start = async () => {
  await connect();

  server = app.listen(PORT, () => {
    console.log(
      chalk.bgGreen.bold('SERVER STATUS: '),
      chalk.whiteBright('Server is running on port:'),
      chalk.green.bold(`${PORT}`),
    );
  });

  await sync();
};

['unhandledRejection', 'uncaughtException'].forEach((event) => {
  const index = event.search(/[A-Z]/);
  process.on(event, (err) => {
    console.log(
      chalk.bgRed.bold('SERVER STATUS'),
      chalk.redBright(`${event.slice(0, index).toUpperCase()} ${event.slice(index).toUpperCase()}! \n`),
      chalk.redBright(`${err.message}\n`),
      chalk.redBright.italic(err.stack),
    );
    server.close(() => {
      process.exit(1);
    });
  });
});

['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((event) => {
  process.on(event, () => {
    console.log(chalk.yellowBright.bold('SERVER STATUS'), chalk.whiteBright(`${event} RECEIVED!`));
    server.close(() => {
      console.log(chalk.bgGreen.bold('SERVER STATUS'), chalk.greenBright('Process terminated'));
    });
  });
});

start();
