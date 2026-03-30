const User = require('../models/User');
const Token = require('../models/Token');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../services/emailService');
const crypto = require('crypto');

// Generate JWT tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign({ user: userId }, process.env.ACCESS_TOKEN_SECRET || 'secret', { expiresIn: '15m' });
    const refreshToken = jwt.sign({ user: userId }, process.env.REFRESH_TOKEN_SECRET || 'refreshSecret', { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
    try {
        let { name, email, password } = req.body;
        email = email.trim().toLowerCase();

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create User
        const newUser = await User.create({
            name,
            email,
            password: password_hash,
            role: 'user' // Always 'user' on registration
        });

        // Generate Token
        const { accessToken, refreshToken } = generateTokens(newUser._id);

        // Store Refresh Token in DB
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await Token.create({
            user: newUser._id,
            token: refreshToken,
            type: 'refresh',
            expires_at: expiresAt
        });

        // Send Cookies
        res.cookie('jwt', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({
            accessToken,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                is_verified: newUser.is_verified
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email.trim().toLowerCase();

        const user = await User.findOne({ email });
        console.log(`[DEBUG] Login attempt for: ${email}`);

        if (!user) {
            console.log(`[DEBUG] User not found in MongoDB`);
            return res.status(401).json({ msg: 'Invalid Credential' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        console.log(`[DEBUG] Password Match Result: ${validPassword}`);

        if (!validPassword) {
            return res.status(401).json({ msg: 'Invalid Credential' });
        }

        const { accessToken, refreshToken } = generateTokens(user._id);

        // Store Refresh Token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await Token.create({
            user: user._id,
            token: refreshToken,
            type: 'refresh',
            expires_at: expiresAt
        });

        res.cookie('jwt', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

        console.log(`[LOGIN] User: ${user.email}, Role in DB: "${user.role}"`);

        res.json({
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.refresh = async (req, res) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.jwt) return res.sendStatus(401);
        const refreshToken = cookies.jwt;

        const foundToken = await Token.findOne({ token: refreshToken, revoked: false });
        if (!foundToken) return res.sendStatus(403); // Forbidden

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'refreshSecret', (err, decoded) => {
            if (err || foundToken.user.toString() !== decoded.user) return res.sendStatus(403);
            const accessToken = jwt.sign({ user: decoded.user }, process.env.ACCESS_TOKEN_SECRET || 'secret', { expiresIn: '15m' });
            res.json({ accessToken });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.logout = async (req, res) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.jwt) return res.sendStatus(204);

        const refreshToken = cookies.jwt;

        // Delete refreshToken in db
        await Token.deleteOne({ token: refreshToken });

        res.clearCookie('jwt', { httpOnly: true, secure: false, sameSite: 'lax' });
        res.sendStatus(204);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Delete old tokens for this user
        await Token.deleteMany({ user: user._id, type: 'password_reset' });

        await Token.create({
            user: user._id,
            token: otp,
            type: 'password_reset',
            expires_at: expiresAt
        });

        // Send Email
        await sendResetPasswordEmail(email, otp);

        res.json({ msg: 'OTP sent to email' });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error ' + err.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid request' });

        const tokenRecord = await Token.findOne({
            user: user._id,
            token: otp,
            type: 'password_reset',
            expires_at: { $gt: new Date() }
        });

        if (!tokenRecord) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Cleanup
        await Token.deleteMany({ user: user._id, type: { $in: ['password_reset', 'refresh'] } });

        res.json({ msg: 'Password reset successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error ' + err.message });
    }
};

exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_verified: user.is_verified
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
