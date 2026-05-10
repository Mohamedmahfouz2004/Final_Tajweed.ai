require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash('admin123', salt);
        
        await db.collection('users').insertOne({
            name: 'Tajweed Admin',
            email: 'admin@tajweed.ai',
            password: hashed,
            role: 'admin',
            is_verified: true,
            createdAt: new Date()
        });
        
        console.log('✅ Admin user created: admin@tajweed.ai / admin123');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createAdmin();
