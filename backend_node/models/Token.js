const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true },
    type: { type: String, enum: ['refresh', 'verification', 'password_reset'], required: true },
    expires_at: { type: Date, required: true },
    revoked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Token', tokenSchema);
