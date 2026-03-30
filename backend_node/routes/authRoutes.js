const router = require('express').Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validInfo');
const authorize = require('../middleware/authorize');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', authorize, authController.me);

// Forgot/Reset Password
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
