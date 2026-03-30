const User = require('../models/User');

// Middleware to check if user is admin
module.exports = async function (req, res, next) {
    try {
        const user_id = req.user; // Set by the 'authorize' middleware

        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admins only' });
        }

        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
