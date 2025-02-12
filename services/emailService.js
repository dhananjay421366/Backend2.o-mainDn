import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
});
//I have to change it when I got frontend. means the mails will send to open frontend page where there will button for verify which will call this verification link(api endpoint) 
export const sendVerificationEmail = async (email, verificationLink) => {
  console.log('email is sending');
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "verification link for email ✔",
    text: `Click this link to verify your gmail: ${verificationLink}`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log('Error sending email', error);
    } else {
      console.log('Email sent: ' + info.response);
      console.log('Sending email to:', email);
    }
  }
  )
};

export const sendResetPassword = async (email, link) => {
  async function main() {
    const info = transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,// list of receivers
      subject: "verification otp ✔", // Subject line
      text: `click link to cverify ${link}`, // link will open the frontend part and at there one button will be there to post req with id ,token and password
    });
  }
  main();
};

export const sendNotificationEmail = async (email, subject, content) => {
  async function main() {
    const info = transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,// list of receivers
      subject: subject,
      text: content,
    });
  }
  main();
};
export const sendBookingConfirmationEmail = async (email, bookingDetails) => {
  const { eventName, bookingId, ticketQuantity, eventDate, userName, userEmail, userPhone, ticketType, amount, venue, tickets } = bookingDetails;
  console.log("The ticket on email page", tickets);
  // Load the HTML template
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templatePath = path.join(__dirname, '../templates', 'BookingConfirm.html');
  let emailTemplate = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholders with actual data
  emailTemplate = emailTemplate
    .replace('[User Name]', userName)
    .replace('[Booking Date]', new Date().toLocaleDateString())
    .replace('[Booking Time]', new Date().toLocaleTimeString())
    .replace('[Booking ID]', bookingId)
    .replace('[Amount]', `INR ${amount}`)
    .replace('[Event Name]', eventName)
    .replace('[Event Venue]', venue || 'Online')
    .replace('[Event Date]', eventDate)
    .replace('[Ticket Holder Name]', userName)
    .replace('[Ticket Holder Email]', userEmail)
    .replace('[Phone Number]', userPhone)
    .replace('[Ticket Count]', ticketQuantity)
    .replace('[Ticket Type]', ticketType);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Booking Confirmation ✔",
    html: emailTemplate,
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending booking confirmation email:", error);
    } else {
      console.log("Booking confirmation email sent:", info.response);
    }
  });
};


