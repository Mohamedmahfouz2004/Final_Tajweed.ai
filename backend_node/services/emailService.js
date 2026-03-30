const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: true, // Show debug info
    logger: true // Log to console
});

const sendVerificationEmail = async (to, token) => {
    // Placeholder for verification email if needed
    console.log('Verification email logic intentionally skipped for now.');
};

const sendResetPasswordEmail = async (to, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: 'Tajweed App - Password Reset OTP',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="color: #0d9488;">Reset Your Password</h2>
                    <p style="color: #555;">Use the following OTP code to reset your password. This code is valid for 10 minutes.</p>
                    <div style="margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #e0f2f1; padding: 10px 20px; border-radius: 5px;">${otp}</span>
                    </div>
                    <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Email send error:', error);
    }
};

module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail
};
