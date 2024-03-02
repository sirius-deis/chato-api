const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
const logger = require("./logger");

const { NODE_ENV, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } =
  process.env;

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

const handlebarOptions = {
  viewEngine: {
    extname: ".handlebars",
    partialsDir: path.resolve(__dirname, "../views", "emails"),
    layoutsDir: path.resolve(__dirname, "../views", "emails", "layouts"),
    defaultLayout: path.resolve(
      __dirname,
      "../views",
      "emails",
      "layouts",
      "root.emails.handlebars"
    ),
  },
  viewPath: path.resolve(__dirname, "../views/emails/"),
  extName: ".handlebars",
};

transporter.use("compile", hbs(handlebarOptions));

const sendMail = async (to, subject, template, context) => {
  const mailOptions = {
    from: `< Name Surname ${EMAIL_USER}>`,
    to,
    subject,
    template: `${template}.emails`,
    context,
  };
  try {
    await transporter.sendMail(mailOptions);
    if (NODE_ENV === "development") {
      logger.debug(context.link);
    }
    await transporter.sendMail(mailOptions);
  } catch (err) {
    throw new Error(err);
  }
};

module.exports = sendMail;
