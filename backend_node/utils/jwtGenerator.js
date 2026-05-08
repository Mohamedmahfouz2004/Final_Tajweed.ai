const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateAccessToken = (userId) => {
    return jwt.sign({ user_id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
};

const generateRefreshToken = (userId) => {
    return jwt.sign({ user_id: userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
};

module.exports = { generateAccessToken, generateRefreshToken };
