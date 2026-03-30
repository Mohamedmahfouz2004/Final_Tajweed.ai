const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match'
    }),
    role: Joi.string().valid('user', 'admin').optional()
}).unknown(true);

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    role: Joi.string().valid('user', 'admin').optional()
}).unknown(true);

const validateRegister = (req, res, next) => {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ msg: error.details[0].message });
    next();
};

const validateLogin = (req, res, next) => {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ msg: error.details[0].message });
    next();
};

module.exports = { validateRegister, validateLogin };
