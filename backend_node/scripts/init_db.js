const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres'
});

const targetDB = process.env.DB_NAME;

async function initDB() {
    try {
        const client = await pool.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${targetDB}'`);
        if (res.rowCount === 0) {
            console.log(`Creating database ${targetDB}...`);
            await client.query(`CREATE DATABASE "${targetDB}"`);
        } else {
            console.log(`Database ${targetDB} already exists.`);
        }
        client.release();
        await pool.end();

        const targetPool = new Pool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: targetDB
        });

        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Cleaning up existing tables (Development Mode)...');
        await targetPool.query(`
            DROP TABLE IF EXISTS password_reset_tokens;
            DROP TABLE IF EXISTS verification_tokens;
            DROP TABLE IF EXISTS refresh_tokens;
            DROP TABLE IF EXISTS progress;
            DROP TABLE IF EXISTS error_logs;
            DROP TABLE IF EXISTS error_types;
            DROP TABLE IF EXISTS quizzes;
            DROP TABLE IF EXISTS lessons;
            DROP TABLE IF EXISTS users;
        `);

        console.log('Running Schema...');
        await targetPool.query(schemaSql);
        console.log('✅ Database Initialized Successfully with New Tables!');
        await targetPool.end();

    } catch (err) {
        console.error('❌ Initialization Error:', err);
    }
}

initDB();
