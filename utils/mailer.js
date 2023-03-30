const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const transporterDetails = smtpTransport({
  service: 'gmail',
  secure: true,
  auth: {
    user: 'Your Email',
    pass: 'Your Email Password',
  },
});

exports.sendEmail = (email, fullname, subject, message) => {
  const transporter = nodemailer.createTransport(transporterDetails);
  const options = {
    from: 'Your Email',
    to: email,
    subject: subject,
    html: `<h1>سلام ${fullname}</h1>\n<p>${message}</p>`,
  };
  transporter.sendMail(options);
};
