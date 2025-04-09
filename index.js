const express = require('express');
const path = require('path');
const db = require('./db'); // Use the existing db.js file for database connection
const app = express();
const port = 3000;

app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for the staff
app.get('/nurse-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'nurse-dashboard.html'));
});

app.post('/api/appointments', (req, res) => {
  const { date, time, service, notes, userId } = req.body;
  
  // Parse the formatted date string into a Date object
  const dateObj = new Date(date);
  const formattedDate = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD for MySQL
  
  // Convert 12-hour time format to 24-hour
  let formattedTime = time;
  if (time.includes('AM') || time.includes('PM')) {
    const [hour, minutesPeriod] = time.split(':');
    const minutes = minutesPeriod.slice(0, 2);
    const period = minutesPeriod.slice(2).trim();
    let hourNum = parseInt(hour);
    if (period === 'PM' && hourNum < 12) hourNum += 12;
    if (period === 'AM' && hourNum === 12) hourNum = 0;
    formattedTime = `${hourNum.toString().padStart(2, '0')}:${minutes}:00`;
  }

  const query = `
      INSERT INTO Appointments (user_id, service_id, appointment_date, appointment_time, status)
      VALUES (?, (SELECT service_id FROM Services WHERE service_name = ?), ?, ?, 'pending')
  `;

  db.query(query, [userId, service, formattedDate, formattedTime], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    const confirmationCode = `BUPC-${new Date().getFullYear()}-${result.insertId}`;
    
    // Create confirmation record
    const confirmQuery = `
      INSERT INTO AppointmentConfirmations (appointment_id, confirmation_code)
      VALUES (?, ?)
    `;
    
    db.query(confirmQuery, [result.insertId, confirmationCode], (confirmErr) => {
      if (confirmErr) {
        console.error(confirmErr);
        // Continue anyway since the appointment was created
      }
      
      res.json({ confirmationCode });
    });
  });
});

// Route to fetch time slots
app.get('/api/time-slots', (req, res) => {
  const query = `
    SELECT 
      appointment_date, 
      appointment_time, 
      is_available 
    FROM TimeSlots
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching time slots:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

app.get('/api/appointments', (req, res) => {
  const query = `
  SELECT 
  a.appointment_id AS id,
  CONCAT(u.first_name, ' ' ,u.last_name) AS patient,
  a.appointment_date AS date,
  a.appointment_time AS time,
  a.status
  FROM Appointments a 
  JOIN Users u ON a.user_id = u.user_id
  ORDER BY a.appointment_date, a.appointment_time
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Visit http://localhost:${port} in your browser`);
});