const connectDB = require('../config/db');
const { Progress, Mistake } = require('../models/Progress');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function clearProgress() {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');

        // Delete all progress and mistakes
        const progressResult = await Progress.deleteMany({});
        const mistakesResult = await Mistake.deleteMany({});

        console.log(`🗑️ Deleted ${progressResult.deletedCount} Progress records.`);
        console.log(`🗑️ Deleted ${mistakesResult.deletedCount} Mistake records.`);
        
        console.log('✨ All user progress and mistakes have been completely cleared!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error clearing database:', err.message);
        process.exit(1);
    }
}

clearProgress();
