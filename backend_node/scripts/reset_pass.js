const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tajweed_db');
        console.log('Connected to MongoDB');

        const email = 'mhfwz8889@gmail.com';
        const newPassword = '123';
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const user = await User.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        );

        if (user) {
            console.log(`✅ Password for ${email} has been reset to: ${newPassword}`);
        } else {
            console.log('❌ User not found');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

resetPassword();
