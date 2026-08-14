const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// File upload setup for attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Initialize SQLite Database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Database opening error: ', err.message);
  } else {
    console.log('Connected to SQLite Database.');
  }
});

// Create Tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobile_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    gender TEXT,
    dob TEXT,
    age INTEGER NOT NULL,
    alternate_number TEXT,
    cnic TEXT,
    address TEXT,
    city TEXT,
    blood_group TEXT,
    marital_status TEXT,
    occupation TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    allergies TEXT,
    disease_history TEXT,
    remarks TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    doctor_name TEXT,
    department TEXT,
    visit_type TEXT,
    payment_method TEXT,
    fee INTEGER,
    queue_number TEXT,
    status TEXT DEFAULT 'Waiting',
    payment_status TEXT DEFAULT 'Unpaid',
    action_status TEXT DEFAULT 'Pending',
    appointment_date TEXT,
    medicines TEXT,
    lab_tests TEXT,
    notes TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  )`);

  // Safe Column Alterations
  const columnsToAdd = [
    `ALTER TABLE appointments ADD COLUMN appointment_date TEXT`,
    `ALTER TABLE appointments ADD COLUMN lab_fee INTEGER`,
    `ALTER TABLE appointments ADD COLUMN lab_remarks TEXT`,
    `ALTER TABLE appointments ADD COLUMN cash_given INTEGER`,
    `ALTER TABLE appointments ADD COLUMN return_change INTEGER`,
    `ALTER TABLE appointments ADD COLUMN attached_file TEXT`,
    `ALTER TABLE appointments ADD COLUMN vitals_done INTEGER DEFAULT 0`
  ];

  columnsToAdd.forEach(query => {
    db.run(query, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.log('Column check notice:', err.message);
      }
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER,
    patient_name TEXT,
    doctor_name TEXT,
    diagnosis TEXT,
    medicines TEXT,
    instructions TEXT,
    bill_amount INTEGER DEFAULT 1500,
    lab_bill INTEGER DEFAULT 2000,
    status TEXT DEFAULT 'Pending',
    lab_status TEXT DEFAULT 'Pending',
    FOREIGN KEY(appointment_id) REFERENCES appointments(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    department TEXT,
    phone TEXT,
    email TEXT,
    cnic TEXT,
    timing TEXT,
    gender TEXT,
    fee TEXT,
    status TEXT,
    availability TEXT
  )`);
});

// Search Patient by Mobile
app.get('/api/patients/search/:mobile', (req, res) => {
  const mobile = req.params.mobile;
  db.get(`SELECT * FROM patients WHERE mobile_number = ? ORDER BY id DESC LIMIT 1`, [mobile], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Patient not found' });
    res.json({
      mr_id: `MR-2026-${String(row.id).padStart(4, '0')}`,
      first_name: row.first_name,
      last_name: row.last_name,
      gender: row.gender,
      dob: row.dob,
      age: row.age,
      alternate_number: row.alternate_number,
      cnic: row.cnic,
      address: row.address,
      city: row.city,
      blood_group: row.blood_group,
      marital_status: row.marital_status,
      occupation: row.occupation,
      emergency_contact: row.emergency_contact,
      emergency_phone: row.emergency_phone,
      allergies: row.allergies,
      disease_history: row.disease_history,
      remarks: row.remarks
    });
  });
});

// Patient Portal Search
app.get('/api/patient-portal/search', (req, res) => {
  const mobile = req.query.mobile;
  if (!mobile) return res.status(400).json({ error: 'Mobile number is required' });

  db.get(`SELECT * FROM patients WHERE mobile_number = ? ORDER BY id DESC LIMIT 1`, [mobile], (err, patient) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientId = patient.id;
    const mrId = `MR-2026-${String(patientId).padStart(4, '0')}`;

    const query = `
      SELECT 
        appointments.id as appointment_id,
        appointments.doctor_name,
        appointments.department,
        prescriptions.id as prescription_id,
        prescriptions.diagnosis,
        prescriptions.medicines,
        prescriptions.instructions,
        prescriptions.bill_amount,
        prescriptions.lab_bill,
        prescriptions.status as pharmacy_status,
        prescriptions.lab_status
      FROM appointments
      LEFT JOIN prescriptions ON prescriptions.appointment_id = appointments.id
      WHERE appointments.patient_id = ?
      ORDER BY appointments.id DESC
    `;

    db.all(query, [patientId], (err2, records) => {
      if (err2) return res.status(500).json({ error: err2.message });

      res.json({
        success: true,
        patient: {
          mrId: mrId,
          firstName: patient.first_name,
          lastName: patient.last_name,
          age: patient.age,
          gender: patient.gender,
          mobileNumber: patient.mobile_number,
          bloodGroup: patient.blood_group,
          city: patient.city
        },
        records: records || []
      });
    });
  });
});

// Get appointments for Reception / Doctors Dashboard
app.get('/api/appointments', (req, res) => {
  const doctorName = req.query.doctor;
  
  let query = `
    SELECT 
      appointments.id,
      appointments.queue_number,
      appointments.status,
      appointments.doctor_name,
      appointments.fee,
      appointments.payment_status,
      appointments.action_status,
      appointments.appointment_date,
      appointments.medicines,
      appointments.lab_tests,
      appointments.notes,
      appointments.lab_fee,
      appointments.lab_remarks,
      appointments.cash_given,
      appointments.return_change,
      appointments.attached_file,
      appointments.vitals_done,
      patients.id as patient_id,
      patients.first_name,
      patients.last_name,
      patients.age,
      patients.gender,
      patients.mobile_number,
      patients.cnic,
      patients.address,
      patients.blood_group
    FROM appointments
    JOIN patients ON appointments.patient_id = patients.id
  `;

  let params = [];
  if (doctorName && doctorName !== 'All') {
    const docKeyword = doctorName.split(' ')[1] || doctorName;
    query += ` WHERE (appointments.doctor_name LIKE ? OR appointments.doctor_name LIKE ?)`;
    params.push(`%${docKeyword}%`, `%${doctorName}%`);
  }

  query += ` ORDER BY appointments.id DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const formattedRows = rows.map(row => ({
      _id: row.id,
      id: row.id,
      mrId: `MR-2026-${String(row.patient_id).padStart(4, '0')}`,
      firstName: row.first_name,
      lastName: row.last_name,
      name: `${row.first_name} ${row.last_name || ''}`,
      age: row.age,
      gender: row.gender,
      mobileNumber: row.mobile_number,
      phone: row.mobile_number,
      cnic: row.cnic,
      queueNumber: row.queue_number,
      doctorName: row.doctor_name,
      appointmentDate: row.appointment_date,
      status: row.status || 'Waiting',
      paymentStatus: row.payment_status || 'Unpaid',
      actionStatus: row.action_status || 'Pending',
      fee: row.fee,
      medicines: row.medicines,
      labTests: row.lab_tests,
      notes: row.notes,
      labFee: row.lab_fee,
      labRemarks: row.lab_remarks,
      cashGiven: row.cash_given,
      returnChange: row.return_change,
      attachedFile: row.attached_file,
      vitalsDone: row.vitals_done === 1,
      height: "5'8\"", // Default placeholder or fetch if column exists
      weight: "70kg",
      bp: "120/80",
      pulse: "72"
    }));

    res.json(formattedRows);
  });
});

// Register Patient & Appointment
app.post('/api/appointments/register', (req, res) => {
  const {
    mobileNumber, firstName, lastName, gender, dob, age, 
    alternateNumber, cnic, address, city, bloodGroup, 
    maritalStatus, occupation, emergencyContact, emergencyPhone, 
    allergies, diseaseHistory, remarks, doctorName, department, 
    visitType, paymentMethod, fee, appointmentDate, cashGiven, returnChange
  } = req.body;

  const fName = (firstName && firstName.trim() !== '') ? firstName.trim() : 'Guest';
  const pAge = (age !== undefined && age !== '') ? parseInt(age) : 0;
  const pMobile = mobileNumber || '00000000000';

  const todayStr = new Date().toISOString().split('T')[0];
  const apptDate = appointmentDate || todayStr;

  const patientQuery = `
    INSERT INTO patients (
      mobile_number, first_name, last_name, gender, dob, age, 
      alternate_number, cnic, address, city, blood_group, 
      marital_status, occupation, emergency_contact, emergency_phone, 
      allergies, disease_history, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(patientQuery, [
    pMobile, fName, lastName || '', gender || 'Female', dob || '', pAge,
    alternateNumber || '', cnic || '', address || '', city || '', bloodGroup || 'A+',
    maritalStatus || 'Single', occupation || '', emergencyContact || '', emergencyPhone || '',
    allergies || '', diseaseHistory || '', remarks || ''
  ], function(err) {
    if (err) return res.status(400).json({ success: false, error: err.message });

    const patientId = this.lastID;
    const queueNumber = `Q00${Math.floor(1 + Math.random() * 99)}`;
    const mrId = `MR-2026-${String(patientId).padStart(4, '0')}`;

    const apptQuery = `
      INSERT INTO appointments (patient_id, doctor_name, department, visit_type, payment_method, fee, queue_number, status, payment_status, action_status, appointment_date, cash_given, return_change)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Waiting', 'Unpaid', 'Pending', ?, ?, ?)
    `;

    db.run(apptQuery, [
      patientId, doctorName || 'Dr. Ahmed', department || 'General Medicine', visitType || 'New Patient', 
      paymentMethod || 'Cash', fee || 1000, queueNumber, apptDate, 
      cashGiven !== undefined && cashGiven !== '' ? Number(cashGiven) : 0, 
      returnChange !== undefined && returnChange !== '' ? Number(returnChange) : 0
    ], function(err2) {
      if (err2) return res.status(400).json({ success: false, error: err2.message });

      res.json({
        success: true,
        mrId: mrId,
        queueNumber: queueNumber,
        appointmentDate: apptDate,
        message: 'Patient registered successfully'
      });
    });
  });
});

// Attach File Endpoint for Reception Panel
app.post('/api/appointments/attach/:id', upload.single('file'), (req, res) => {
  const { id } = req.params;
  const fileName = req.file ? req.file.filename : null;

  if (!fileName) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const query = `UPDATE appointments SET attached_file = ? WHERE id = ?`;
  db.run(query, [fileName, id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'File attached successfully', fileName });
  });
});

// Update Patient Payment & Action Status Route
app.put('/api/appointments/status/:id', (req, res) => {
  const { id } = req.params;
  const { paymentStatus, actionStatus } = req.body;

  const query = `
    UPDATE appointments 
    SET 
      payment_status = COALESCE(?, payment_status),
      action_status = COALESCE(?, action_status)
    WHERE id = ?
  `;
  
  db.run(query, [paymentStatus || null, actionStatus || null, id], function(err) {
    if (err) {
      console.error("Database update error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Status updated successfully' });
  });
});

// Route to Call Patient from Queue
app.put('/api/appointments/call/:id', (req, res) => {
  const { id } = req.params;
  const { actionStatus } = req.body;

  const query = `UPDATE appointments SET action_status = ? WHERE id = ?`;
  db.run(query, [actionStatus || 'In Consultation', id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Patient called successfully' });
  });
});

// Route to Save Medicines, Lab Tests & Action Status (also handles TRP vitals-done flag)
app.put('/api/appointments/action/:id', (req, res) => {
  const { id } = req.params;
  const { actionStatus, medicines, labTests, notes, vitalsDone } = req.body;

  const appStatus = (actionStatus === 'Completed') ? 'Completed' : 'Waiting';

  const query = `
    UPDATE appointments 
    SET 
      action_status = ?, 
      medicines = COALESCE(?, medicines), 
      lab_tests = COALESCE(?, lab_tests), 
      notes = COALESCE(?, notes),
      status = ?,
      vitals_done = COALESCE(?, vitals_done)
    WHERE id = ?
  `;

  db.run(query, [
    actionStatus || 'Pending',
    medicines,
    labTests,
    notes,
    appStatus,
    vitalsDone === true ? 1 : null,
    id
  ], function(err) {
    if (err) {
      console.error("Error updating action:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Consultation updated successfully' });
  });
});

// Route to Save Lab Slip Fee & Remarks
app.put('/api/appointments/lab/:id', (req, res) => {
  const { id } = req.params;
  const { labFee, labRemarks } = req.body;

  const query = `
    UPDATE appointments 
    SET 
      lab_fee = ?, 
      lab_remarks = ?
    WHERE id = ?
  `;

  db.run(query, [labFee || 0, labRemarks || '', id], function(err) {
    if (err) {
      console.error("Error updating lab slip:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true, message: 'Lab slip updated successfully', labFee, labRemarks });
  });
});

// Save prescription with Diagnosis
app.post('/api/prescriptions/save', (req, res) => {
  const { appointmentId, patientName, doctorName, diagnosis, medicines, instructions } = req.body;
  const billAmount = Math.floor(800 + Math.random() * 2700);
  const labBill = Math.floor(1000 + Math.random() * 2500);

  const query = `
    INSERT INTO prescriptions (appointment_id, patient_name, doctor_name, diagnosis, medicines, instructions, bill_amount, lab_bill, status, lab_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending')
  `;

  db.run(query, [appointmentId, patientName, doctorName, diagnosis || '', medicines, instructions || '', billAmount, labBill], function(err) {
    if (err) return res.status(400).json({ success: false, error: err.message });

    db.run(`UPDATE appointments SET status = 'Completed' WHERE id = ?`, [appointmentId], (err2) => {
      if (err2) return res.status(400).json({ success: false, error: err2.message });
      res.json({ success: true, message: 'Saved and bills generated' });
    });
  });
});

// Pharmacy and Lab routes
app.get('/api/pharmacy/orders', (req, res) => {
  db.all(`SELECT * FROM prescriptions WHERE status = 'Pending' ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/pharmacy/dispense/:id', (req, res) => {
  const id = req.params.id;
  db.run(`UPDATE prescriptions SET status = 'Dispensed' WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/lab/orders', (req, res) => {
  db.all(`SELECT * FROM prescriptions WHERE lab_status = 'Pending' AND instructions IS NOT NULL AND instructions != '' ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/lab/complete/:id', (req, res) => {
  const id = req.params.id;
  db.run(`UPDATE prescriptions SET lab_status = 'Completed' WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ===== Doctor Management Routes =====

app.get('/api/doctors', (req, res) => {
  db.all(`SELECT * FROM doctors ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const doctors = rows.map((doc) => ({
      ...doc,
      availability: doc.availability ? doc.availability.split(',') : []
    }));
    res.json(doctors);
  });
});
// Remove attached file from an appointment
app.put('/api/appointments/detach/:id', (req, res) => {
  const { id } = req.params;
  const query = `UPDATE appointments SET attached_file = NULL WHERE id = ?`;
  db.run(query, [id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'File removed successfully' });
  });
});

app.post('/api/doctors', (req, res) => {
  const { name, department, phone, email, cnic, timing, gender, fee, status, availability } = req.body;
  const availStr = Array.isArray(availability) ? availability.join(',') : '';

  db.run(
    `INSERT INTO doctors (name, department, phone, email, cnic, timing, gender, fee, status, availability)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, department, phone, email, cnic, timing, gender, fee, status, availStr],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/doctors/:id', (req, res) => {
  const { name, department, phone, email, cnic, timing, gender, fee, status, availability } = req.body;
  const availStr = Array.isArray(availability) ? availability.join(',') : '';

  db.run(
    `UPDATE doctors SET name=?, department=?, phone=?, email=?, cnic=?, timing=?, gender=?, fee=?, status=?, availability=? WHERE id=?`,
    [name, department, phone, email, cnic, timing, gender, fee, status, availStr, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.delete('/api/doctors/:id', (req, res) => {
  db.run(`DELETE FROM doctors WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ removed: this.changes });
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});