require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash('password123', salt);
        
        await db.collection('users').updateOne(
            { email: 'mohamedabohassan897@gmail.com' },
            { $set: { password: hashed } }
        );
        
        console.log('✅ Password for mohamedabohassan897@gmail.com reset to: password123');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

resetPassword();
