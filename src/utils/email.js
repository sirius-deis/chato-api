const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;

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
        partialsDir: path.resolve('./views/'),
        defaultLayout: false,
    },
    viewPath: path.resolve(__dirname, '../public/views/'),
};

transporter.use('compile', hbs(handlebarOptions));

const sendMail = async (to, subject, template, context) => {
    const mailOptions = {
        from: EMAIL_USER,
        to,
        subject,
        template: `${template}.email`,
        context,
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        throw new Error(err);
    }
};

module.exports = sendMail;
