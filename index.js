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

// Improved appointment creation with proper date handling
app.post('/api/appointments', (req, res) => {
  // Generate a unique request ID to track duplicates
  const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  console.log(`Processing appointment request ${requestId}`);
  
  const { date, time, service, notes, userId } = req.body;
  
  // Validate required fields
  if (!date || !time || !service || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Parse date correctly to avoid timezone issues
    const parts = date.split(',');
    const monthDay = parts[1].trim().split(' ');
    const month = getMonthNumber(monthDay[0]);
    const day = parseInt(monthDay[1]);
    const year = parseInt(parts[2].trim());
    
    // Format as YYYY-MM-DD for MySQL
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
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

    console.log(`[${requestId}] Checking availability for date: ${formattedDate} and time: ${formattedTime}`);

    // Check for existing appointments with the same date and time
    const checkQuery = `
      SELECT appointment_id, status FROM Appointments 
      WHERE appointment_date = ? AND appointment_time = ? AND status IN ('confirmed')
    `;

    db.query(checkQuery, [formattedDate, formattedTime], (checkErr, checkResult) => {
      if (checkErr) {
        console.error(`[${requestId}] Error checking slot availability:`, checkErr);
        return res.status(500).json({ error: 'Database error', message: checkErr.message });
      }

      console.log(`[${requestId}] Check result:`, checkResult); // Debug log
      
      if (checkResult && checkResult.length > 0) {
        console.log(`[${requestId}] Time slot already booked - returning 409 conflict`);
        return res.status(409).json({ 
          error: 'Time slot already booked',
          message: 'This time slot is already taken. Please select a different time.' 
        });
      }

      // Insert the appointment
      const insertQuery = `
        INSERT INTO Appointments (user_id, service_id, appointment_date, appointment_time, status, additional_notes)
        VALUES (?, (SELECT service_id FROM Services WHERE service_name = ?), ?, ?, 'pending', ?)
      `;

      db.query(insertQuery, [userId, service, formattedDate, formattedTime, notes || ''], (insertErr, insertResult) => {
        if (insertErr) {
          console.error(`[${requestId}] Error inserting appointment:`, insertErr);
          
          // Special handling for duplicate entry errors
          if (insertErr.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
              error: 'Time slot already booked',
              message: 'This time slot is already taken. Please select a different time.'
            });
          }
          
          return res.status(500).json({ error: 'Database error', message: insertErr.message });
        }

        const appointmentId = insertResult.insertId;
        const confirmationCode = `BUPC-${new Date().getFullYear()}-${appointmentId}`;
        
        // Create confirmation record
        const confirmQuery = `
          INSERT INTO AppointmentConfirmations (appointment_id, confirmation_code)
          VALUES (?, ?)
        `;
        
        db.query(confirmQuery, [appointmentId, confirmationCode], (confirmErr) => {
          if (confirmErr) {
            console.error(`[${requestId}] Error creating confirmation:`, confirmErr);
          }
          
          // Return success response
          console.log(`[${requestId}] Appointment successfully booked with code ${confirmationCode}`);
          res.status(200).json({ 
            success: true,
            confirmationCode,
            appointmentDate: formattedDate, 
            appointmentTime: time,
            message: 'Appointment successfully booked!'
          });
        });
      });
    });
  } catch (error) {
    console.error(`[${requestId}] Error processing appointment request:`, error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Helper function to convert month name to number
function getMonthNumber(monthName) {
  const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  return months[monthName];
}

// Improved time slots endpoint that only considers confirmed appointments
app.get('/api/time-slots', (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required' });
  }

  console.log('Requested date for time slots:', date); // Debug log

  const query = `
    SELECT 
      TIME_FORMAT(appointment_time, '%h:%i %p') AS time,
      status
    FROM Appointments
    WHERE appointment_date = ? 
    AND status = 'confirmed'  /* Only consider confirmed appointments */
  `;

  db.query(query, [date], (err, results) => {
    if (err) {
      console.error('Error fetching time slots:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('Found appointments:', results); // Debug log

    // Define all possible time slots
    const allTimeSlots = [
      '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
    ];

    // Extract booked time slots
    const bookedSlots = results.map(row => row.time);

    // Determine available time slots
    const availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

    console.log('Available slots:', availableSlots); // Debug log
    res.json({ availableSlots });
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