const connectDB = require('../config/db');
const User = require('../models/User');
const email = process.argv[2];
const role = process.argv[3] || 'admin';

if (!email) {
    console.error('❌ Please provide an email address.');
    console.log('Usage: node scripts/set_admin.js <email> [role]');
    process.exit(1);
}

async function updateRole() {
    try {
        await connectDB();
        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { role },
            { new: true }
        );

        if (user) {
            console.log(`✅ User ${email} role updated to: ${role}`);
        } else {
            console.log(`⚠️ No user found with email: ${email}`);
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating user:', err);
        process.exit(1);
    }
}

updateRole();
