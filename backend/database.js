const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database file creation
const dbPath = path.join(__dirname, 'hms.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database successfully.');
    }
});

// Create Reception Tables
db.serialize(() => {
    // 1. Patients Table
    db.run(`
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mr_id TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            gender TEXT NOT NULL,
            age INTEGER NOT NULL,
            mobile_number TEXT UNIQUE NOT NULL,
            address TEXT,
            blood_group TEXT,
            disease_history TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Appointments Table
    db.run(`
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_name TEXT NOT NULL,
            department TEXT NOT NULL,
            visit_type TEXT CHECK(visit_type IN ('New', 'Follow Up', 'Emergency')) NOT NULL,
            status TEXT DEFAULT 'Waiting',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        )
    `);

    // 3. Queue Table
    db.run(`
        CREATE TABLE IF NOT EXISTS queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            queue_number TEXT NOT NULL,
            appointment_id INTEGER NOT NULL,
            doctor_name TEXT NOT NULL,
            status TEXT DEFAULT 'Waiting',
            FOREIGN KEY (appointment_id) REFERENCES appointments(id)
        )
    `);
});

module.exports = db;