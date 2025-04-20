const express = require('express');
const path = require('path');
const db = require('./db'); // Use the existing db.js file for database connection
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
  secret: 'bupc_clinic_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  
  // For API requests, return a more descriptive JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Your session may have expired or you are not logged in yet',
      loginUrl: '/login.html',
      helpText: 'Please sign in to access this feature' 
    });
  }
  
  // For page requests, redirect to login
  res.redirect('/login.html');
}

// Staff authorization middleware
function isStaff(req, res, next) {
  if (req.session.userType === 'staff') {
    return next();
  }
  
  // For API requests, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  
  // For page requests, redirect to home
  res.redirect('/');
}

// Route for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for staff dashboard - protected
app.get('/nurse-dashboard', isAuthenticated, isStaff, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'nurse-dashboard.html'));
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  const query = 'SELECT user_id, first_name, last_name, email, password, user_type FROM Users WHERE email = ?';
  
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = results[0];
    
    try {
      // For existing users without hashed passwords (temporary for development)
      if (user.password === 'defaultpassword') {
        // Set session data
        req.session.userId = user.user_id;
        req.session.userType = user.user_type;
        req.session.userName = `${user.first_name} ${user.last_name}`;
        
        return res.json({
          user_id: user.user_id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          user_type: user.user_type
        });
      }
      
      // For users with hashed passwords
      const match = await bcrypt.compare(password, user.password);
      
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Set session data
      req.session.userId = user.user_id;
      req.session.userType = user.user_type;
      req.session.userName = `${user.first_name} ${user.last_name}`;
      
      // Return user info (without password)
      res.json({
        user_id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        user_type: user.user_type
      });
      
    } catch (error) {
      console.error('Error comparing passwords:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Logout endpoint
app.get('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, password, user_type = 'student' } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if email already exists
    const checkEmailQuery = 'SELECT user_id FROM Users WHERE email = ?';
    db.query(checkEmailQuery, [email], async (checkErr, checkResult) => {
      if (checkErr) {
        console.error('Error checking email:', checkErr);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (checkResult.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new user
      const insertQuery = `
        INSERT INTO Users (first_name, last_name, email, phone_number, password, user_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.query(
        insertQuery, 
        [first_name, last_name, email, phone_number, hashedPassword, user_type], 
        (insertErr, insertResult) => {
          if (insertErr) {
            console.error('Error registering user:', insertErr);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Return success but don't include password
          res.status(201).json({ 
            message: 'Registration successful',
            user_id: insertResult.insertId,
            first_name,
            last_name,
            email
          });
        }
      );
    });
  } catch (error) {
    console.error('Server error during registration:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get session user info
app.get('/api/user/me', isAuthenticated, (req, res) => {
  res.json({
    user_id: req.session.userId,
    name: req.session.userName,
    user_type: req.session.userType
  });
});

// Protected appointment routes
app.post('/api/appointments', isAuthenticated, (req, res) => {
  // Generate a unique request ID to track duplicates
  const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  console.log(`Processing appointment request ${requestId}`);
  
  // Get user ID from session instead of request body
  const userId = req.session.userId;
  const { date, time, service, notes } = req.body;
  
  console.log(`Creating appointment for user ID: ${userId} from session`);
  
  // Validate required fields
  if (!date || !time || !service) {
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
            CONCAT(u.first_name, ' ', u.last_name) AS patient,
            a.appointment_date AS date,
            a.appointment_time AS time,
            ac.confirmation_code,
            s.service_name AS service, -- Ensure service_name is included
            CASE 
                WHEN a.status = 'confirmed' THEN 'approved'
                WHEN a.status = 'cancelled' THEN 'canceled'
                ELSE a.status
            END AS status
        FROM Appointments a
        JOIN Users u ON a.user_id = u.user_id
        JOIN Services s ON a.service_id = s.service_id -- Join with Services table
        LEFT JOIN AppointmentConfirmations ac ON a.appointment_id = ac.appointment_id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// New endpoint to approve an appointment
app.put('/api/appointments/:id/approve', (req, res) => {
  const { id } = req.params;

  // Query to get the date and time of the appointment being approved
  const getAppointmentQuery = `
    SELECT appointment_date, appointment_time 
    FROM Appointments 
    WHERE appointment_id = ?
  `;

  db.query(getAppointmentQuery, [id], (getErr, getResult) => {
    if (getErr) {
      console.error('Error fetching appointment details:', getErr);
      return res.status(500).json({ error: 'Database error' });
    }

    if (getResult.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const { appointment_date, appointment_time } = getResult[0];

    // Approve the selected appointment
    const approveQuery = `UPDATE Appointments SET status = 'confirmed' WHERE appointment_id = ?`;
    db.query(approveQuery, [id], (approveErr) => {
      if (approveErr) {
        console.error('Error approving appointment:', approveErr);
        return res.status(500).json({ error: 'Database error' });
      }

      // Automatically reject conflicting appointments
      const rejectConflictsQuery = `
        UPDATE Appointments 
        SET status = 'cancelled' 
        WHERE appointment_date = ? 
          AND appointment_time = ? 
          AND appointment_id != ? 
          AND status = 'pending'
      `;

      db.query(rejectConflictsQuery, [appointment_date, appointment_time, id], (rejectErr) => {
        if (rejectErr) {
          console.error('Error rejecting conflicting appointments:', rejectErr);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({ success: true, message: 'Appointment approved and conflicts rejected' });
      });
    });
  });
});

// New endpoint to reject an appointment
app.put('/api/appointments/:id/reject', (req, res) => {
  const { id } = req.params;
  const updateQuery = `UPDATE Appointments SET status = 'cancelled' WHERE appointment_id = ?`;
  db.query(updateQuery, [id], (err, result) => {
    if (err) {
      console.error('Error rejecting appointment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, message: 'Appointment rejected' });
  });
});

// Updated API route to fetch medical history from the database
app.get('/api/medical-history', (req, res) => {
    const userId = req.query.user_id; // Get user_id from query params

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const query = `
        SELECT 
            a.appointment_date AS date, 
            TIME_FORMAT(a.appointment_time, '%h:%i %p') AS time,
            s.service_name AS description,
            a.status,
            a.additional_notes AS notes,
            ac.confirmation_code,
            a.created_at
        FROM Appointments a
        JOIN Services s ON a.service_id = s.service_id
        LEFT JOIN AppointmentConfirmations ac ON a.appointment_id = ac.appointment_id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching medical history:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(results);
    });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Visit http://localhost:${port} in your browser`);
});