const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address.');
    process.exit(1);
}

async function generateDirectLogin() {
    try {
        const user = await pool.query('SELECT id, name, email, role FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            console.error('❌ User not found');
            process.exit(1);
        }

        const accessToken = jwt.sign({ user: user.rows[0].id }, process.env.ACCESS_TOKEN_SECRET || 'secret', { expiresIn: '7d' });

        console.log('\n--- نسخ الكود ده وشغله في الـ Console بتاع المتصفح (F12) ---');
        console.log(`
localStorage.setItem('tajweed_token', '${accessToken}');
localStorage.setItem('tajweed_user', JSON.stringify(${JSON.stringify(user.rows[0])}));
window.location.reload();
        `);
        console.log('--- بعد ما تشغله الموقع هيفتح معاك أدمن فوراً ---\n');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

generateDirectLogin();
