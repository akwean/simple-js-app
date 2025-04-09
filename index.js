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

// The original text response route (now at /api)
app.get('/api', (req, res) => {
  res.send('First git commit');
});

app.post('/api/appointments', (req, res) => {
  const { date, time, service, notes, userId } = req.body;
  
  // Parse the formatted date string into a Date object
  const dateObj = new Date(date);
  // Format as YYYY-MM-DD for MySQL
  const formattedDate = dateObj.toISOString().split('T')[0];
  
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
      INSERT INTO appointments (user_id, service_id, appointment_date, appointment_time, status)
      VALUES (?, (SELECT service_id FROM services WHERE name = ?), ?, ?, 'pending')
  `;

  db.query(query, [userId, service, formattedDate, formattedTime], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    const confirmationCode = `BUPC-${new Date().getFullYear()}-${result.insertId}`;
    
    // Create confirmation record
    const confirmQuery = `
      INSERT INTO appointment_confirmations (appointment_id, confirmation_code)
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Visit http://localhost:${port} in your browser`);
});