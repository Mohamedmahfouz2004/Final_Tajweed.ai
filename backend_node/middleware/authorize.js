const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = async (req, res, next) => {
    try {
        // 1. Get token from cookie (preferred) or header
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(403).json({ msg: 'Authorization Denied' });
        }

        // 2. Verify token
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // 3. Attach user to request
        req.user = payload.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
