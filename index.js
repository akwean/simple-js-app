// Load environment variables from .env file
require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db'); // Use the existing db.js file for database connection
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer'); // Ensure nodemailer is installed
const crypto = require('crypto'); // For generating secure tokens
const app = express();

// Email configuration check
const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
if (!emailConfigured) {
  console.warn('⚠️ Email credentials not found in .env file. Email functionality will be disabled.');
  console.warn('⚠️ Please set EMAIL_USER and EMAIL_PASS in your .env file.');
}

// Create email transporter with configuration check
function createTransporter() {
  if (!emailConfigured) {
    return null;
  }
  
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Function to send emails with fallback for development
async function sendEmail(mailOptions) {
  const transporter = createTransporter();
  
  // Format the sender with display name and add reply-to
  if (!mailOptions.from) {
    mailOptions.from = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`;
    // Add reply-to if specified in env
    if (process.env.EMAIL_FROM_ADDRESS) {
      mailOptions.replyTo = process.env.EMAIL_FROM_ADDRESS;
    }
  }
  
  // If no transporter (email not configured), log the email content and return success
  if (!transporter) {
    console.log('📧 [DEV MODE] Email would have been sent:');
    console.log(`📧 From: ${mailOptions.from}`);
    console.log(`📧 To: ${mailOptions.to}`);
    console.log(`📧 Subject: ${mailOptions.subject}`);
    console.log(`📧 Content: ${mailOptions.text || mailOptions.html}`);
    return { success: true, devMode: true };
  }
  
  // Real email sending
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Function to send appointment email with detailed content
async function sendAppointmentEmail(email, appointmentDetails, status, nurseNotes = null) {
  const { date, time, service, confirmationCode } = appointmentDetails;

  let subject, htmlContent;

  if (status === 'pending') {
    subject = 'Appointment Booking Confirmation';
    htmlContent = `
      <h1>Appointment Booking Confirmation</h1>
      <p>Thank you for booking an appointment with BUPC Clinic. Here are the details of your appointment:</p>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Service:</strong> ${service}</li>
        <li><strong>Status:</strong> Pending (awaiting nurse approval)</li>
        <li><strong>Confirmation Code:</strong> ${confirmationCode}</li>
      </ul>
      <p>You will be notified once the nurse reviews your appointment.</p>
    `;
  } else if (status === 'approved') {
    subject = 'Appointment Approved';
    htmlContent = `
      <h1>Appointment Approved</h1>
      <p>Your appointment has been approved. Please find the details below:</p>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Service:</strong> ${service}</li>
        <li><strong>Status:</strong> Approved</li>
        <li><strong>Confirmation Code:</strong> ${confirmationCode}</li>
      </ul>
      <p>Please arrive at least 15 minutes early and bring your ID for verification.</p>
    `;
  } else if (status === 'rejected') {
    subject = 'Appointment Rejected';
    htmlContent = `
      <h1>Appointment Rejected</h1>
      <p>Unfortunately, your appointment has been rejected. Here are the details:</p>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Service:</strong> ${service}</li>
        <li><strong>Status:</strong> Rejected</li>
        <li><strong>Confirmation Code:</strong> ${confirmationCode}</li>
      </ul>
      <p><strong>Reason for Rejection:</strong> ${nurseNotes || 'No reason provided.'}</p>
      <p>You may book another appointment or contact the clinic for further assistance.</p>
    `;
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: htmlContent,
  };

  return sendEmail(mailOptions);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
  secret: 'bupc_clinic_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Keep as false for local development
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

// Student authorization middleware
function isStudent(req, res, next) {
  if (req.session.userType === 'student') {
    return next();
  }
  
  // For API requests, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'This feature is only available to students',
      redirectUrl: '/nurse-dashboard.html'
    });
  }
  
  // For page requests, redirect to nurse dashboard
  res.redirect('/nurse-dashboard.html');
}

// Middleware to check if profile is completed
function profileCompleted(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const query = 'SELECT profile_completed FROM Users WHERE user_id = ?';
  
  db.query(query, [req.session.userId], (err, results) => {
    if (err) {
      console.error('Error checking profile completion:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!results[0].profile_completed) {
      // For API requests, return JSON
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ 
          error: 'Profile not completed',
          message: 'Please complete your profile before proceeding',
          profileUrl: '/profile.html'
        });
      }
      
      // For page requests, redirect to profile page
      return res.redirect('/profile.html');
    }
    
    next();
  });
}

// Route for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for staff dashboard - protected
app.get('/nurse-dashboard', isAuthenticated, isStaff, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'nurse-dashboard.html'));
});

// Route for appointment booking - only for students
app.get('/appointments.html', isAuthenticated, isStudent, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'appointments.html'));
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  const query = 'SELECT user_id, first_name, last_name, email, password, user_type, profile_completed FROM Users WHERE email = ?';
  
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
        req.session.email = user.email;
        
        return res.json({
          user_id: user.user_id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          user_type: user.user_type,
          profile_completed: user.profile_completed
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
      req.session.email = user.email;
      
      // Return user info (without password)
      res.json({
        user_id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        user_type: user.user_type,
        profile_completed: user.profile_completed
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
    res.clearCookie('connect.sid'); // Clear the session cookie
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
            email,
            redirect: '/profile.html' // Add this to tell front-end to redirect to profile page
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
  // Query to get user data including profile completion status
  const query = 'SELECT user_id, first_name, last_name, email, user_type, profile_completed FROM Users WHERE user_id = ?';
  
  db.query(query, [req.session.userId], (err, results) => {
    if (err) {
      console.error('Error fetching user data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = results[0];
    
    res.json({
      user_id: user.user_id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      user_type: user.user_type,
      profile_completed: !!user.profile_completed // Ensure boolean
    });
  });
});

// Profile routes
app.get('/api/profile/status', isAuthenticated, (req, res) => {
  const query = 'SELECT profile_completed FROM Users WHERE user_id = ?';
  
  db.query(query, [req.session.userId], (err, results) => {
    if (err) {
      console.error('Error checking profile status:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ profileCompleted: results[0].profile_completed });
  });
});

app.post('/api/profile', isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  const {
    dateOfBirth, gender, address, city, province, postalCode,
    bloodType, height, weight, allergies, medicalConditions,
    hasInsurance, insuranceProvider, insurancePolicyNumber,
    emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
    guardianName, guardianContact, guardianRelationship
  } = req.body;
  
  // Validate required fields
  if (!dateOfBirth || !gender || !address || !city || !province || !postalCode ||
      !emergencyContactName || !emergencyContactPhone || !emergencyContactRelationship) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }
  
  // Begin transaction
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Check if profile already exists for this user
    db.query('SELECT profile_id FROM Profiles WHERE user_id = ?', [userId], (err, results) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error checking existing profile:', err);
          res.status(500).json({ error: 'Database error' });
        });
      }
      
      let query, params;
      if (results.length > 0) {
        // Update existing profile
        query = `
          UPDATE Profiles
          SET 
            date_of_birth = ?,
            gender = ?,
            blood_type = ?,
            height = ?,
            weight = ?,
            address = ?,
            city = ?,
            province = ?,
            postal_code = ?,
            emergency_contact_name = ?,
            emergency_contact_phone = ?,
            emergency_contact_relationship = ?,
            has_insurance = ?,
            insurance_provider = ?,
            insurance_policy_number = ?,
            known_allergies = ?,
            medical_conditions = ?,
            guardian_name = ?,
            guardian_contact = ?,
            guardian_relationship = ?,
            profile_completed = TRUE,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `;
        
        params = [
          dateOfBirth, gender, bloodType, height, weight,
          address, city, province, postalCode,
          emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
          hasInsurance, insuranceProvider, insurancePolicyNumber,
          allergies, medicalConditions,
          guardianName, guardianContact, guardianRelationship,
          userId
        ];
      } else {
        // Insert new profile
        query = `
          INSERT INTO Profiles (
            user_id, date_of_birth, gender, blood_type, height, weight,
            address, city, province, postal_code,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            has_insurance, insurance_provider, insurance_policy_number,
            known_allergies, medical_conditions,
            guardian_name, guardian_contact, guardian_relationship
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        params = [
          userId, dateOfBirth, gender, bloodType, height, weight,
          address, city, province, postalCode,
          emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
          hasInsurance, insuranceProvider, insurancePolicyNumber,
          allergies, medicalConditions,
          guardianName, guardianContact, guardianRelationship
        ];
      }
      
      db.query(query, params, (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error saving profile:', err);
            res.status(500).json({ error: 'Database error' });
          });
        }
        
        // Update user record to indicate profile is completed
        db.query('UPDATE Users SET profile_completed = TRUE WHERE user_id = ?', [userId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error updating user profile status:', err);
              res.status(500).json({ error: 'Database error' });
            });
          }
          
          // Commit transaction
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('Error committing transaction:', err);
                res.status(500).json({ error: 'Database error' });
              });
            }
            
            // Update session
            req.session.profileCompleted = true;
            res.json({ success: true, message: 'Profile completed successfully' });
          });
        });
      });
    });
  });
});

// Profile GET endpoint
app.get('/api/profile', isAuthenticated, (req, res) => {
  const userId = req.session.userId; // Ensure the user is authenticated and their ID is in the session

  const query = `
    SELECT 
      date_of_birth, gender, address, city, province, postal_code, 
      blood_type, height, weight, known_allergies, medical_conditions, 
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, 
      guardian_name, guardian_contact, guardian_relationship
    FROM Profiles
    WHERE user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching profile:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(results[0]); // Return the profile data
  });
});

// Get user profile by ID
app.get('/api/profile/:user_id', isAuthenticated, (req, res) => {
  const userId = req.params.user_id;
  
  // If no userId provided or invalid
  if (!userId || userId === 'null' || userId === 'undefined') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  const query = `
    SELECT 
      date_of_birth, gender, address, city, province, postal_code,
      blood_type, height, weight, known_allergies, medical_conditions,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      guardian_name, guardian_contact, guardian_relationship
    FROM Profiles
    WHERE user_id = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(results[0]);
  });
});

// Protected appointment routes
app.post('/api/appointments', isAuthenticated, isStudent, profileCompleted, (req, res) => {
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

          // Send email notification
          const mailOptions = {
              from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
              to: req.session.email,
              subject: 'Appointment Confirmation',
              html: `<p>Your appointment has been confirmed for ${formattedDate} at ${time}.</p>`,
          };

          sendEmail(mailOptions)
            .then(() => {
              // Return success response
              console.log(`[${requestId}] Appointment successfully booked with code ${confirmationCode}`);
              res.status(200).json({ 
                success: true,
                confirmationCode,
                appointmentDate: formattedDate, 
                appointmentTime: time,
                message: 'Appointment successfully booked and email sent!'
              });
            })
            .catch((mailErr) => {
              console.error(`[${requestId}] Error sending email:`, mailErr);
              res.status(500).json({ error: 'Failed to send email' });
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

app.get('/api/appointments', isAuthenticated, (req, res) => {
    const query = `
        SELECT 
            a.appointment_id AS id,
            a.user_id, -- Ensure user_id is included
            CONCAT(u.first_name, ' ', u.last_name) AS patient,
            a.appointment_date AS date,
            a.appointment_time AS time,
            ac.confirmation_code,
            s.service_name AS service,
            CASE 
                WHEN a.status = 'confirmed' THEN 'approved'
                WHEN a.status = 'cancelled' THEN 'canceled'
                ELSE a.status
            END AS status
        FROM Appointments a
        JOIN Users u ON a.user_id = u.user_id
        JOIN Services s ON a.service_id = s.service_id
        LEFT JOIN AppointmentConfirmations ac ON a.appointment_id = ac.appointment_id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching appointments:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Updated endpoint to approve an appointment
app.put('/api/appointments/:id/approve', (req, res) => {
  const { id } = req.params;

  const getAppointmentQuery = `
    SELECT a.appointment_date AS date, a.appointment_time AS time, 
           s.service_name AS service, ac.confirmation_code, u.email
    FROM Appointments a
    JOIN Services s ON a.service_id = s.service_id
    LEFT JOIN AppointmentConfirmations ac ON a.appointment_id = ac.appointment_id
    JOIN Users u ON a.user_id = u.user_id
    WHERE a.appointment_id = ?
  `;

  db.query(getAppointmentQuery, [id], (getErr, getResult) => {
    if (getErr) {
      console.error('Error fetching appointment details:', getErr);
      return res.status(500).json({ error: 'Database error' });
    }

    if (getResult.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointmentDetails = getResult[0];

    const approveQuery = `UPDATE Appointments SET status = 'confirmed' WHERE appointment_id = ?`;
    db.query(approveQuery, [id], async (approveErr) => {
      if (approveErr) {
        console.error('Error approving appointment:', approveErr);
        return res.status(500).json({ error: 'Database error' });
      }

      try {
        await sendAppointmentEmail(
          appointmentDetails.email,
          appointmentDetails,
          'approved'
        );
        res.json({ success: true, message: 'Appointment approved and email sent' });
      } catch (emailErr) {
        console.error('Error sending approval email:', emailErr);
        res.status(500).json({ error: 'Appointment approved but failed to send email' });
      }
    });
  });
});

// Updated endpoint to reject an appointment
app.put('/api/appointments/:id/reject', (req, res) => {
  const { id } = req.params;
  const { nurseNotes } = req.body;

  const getAppointmentQuery = `
    SELECT a.appointment_date AS date, a.appointment_time AS time, 
           s.service_name AS service, ac.confirmation_code, u.email
    FROM Appointments a
    JOIN Services s ON a.service_id = s.service_id
    LEFT JOIN AppointmentConfirmations ac ON a.appointment_id = ac.appointment_id
    JOIN Users u ON a.user_id = u.user_id
    WHERE a.appointment_id = ?
  `;

  db.query(getAppointmentQuery, [id], (getErr, getResult) => {
    if (getErr) {
      console.error('Error fetching appointment details:', getErr);
      return res.status(500).json({ error: 'Database error' });
    }

    if (getResult.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointmentDetails = getResult[0];

    const rejectQuery = `UPDATE Appointments SET status = 'cancelled' WHERE appointment_id = ?`;
    db.query(rejectQuery, [id], async (rejectErr) => {
      if (rejectErr) {
        console.error('Error rejecting appointment:', rejectErr);
        return res.status(500).json({ error: 'Database error' });
      }

      try {
        await sendAppointmentEmail(
          appointmentDetails.email,
          appointmentDetails,
          'rejected',
          nurseNotes
        );
        res.json({ success: true, message: 'Appointment rejected and email sent' });
      } catch (emailErr) {
        console.error('Error sending rejection email:', emailErr);
        res.status(500).json({ error: 'Appointment rejected but failed to send email' });
      }
    });
  });
});

// Updated API route to fetch medical history from the database
app.get('/api/medical-history', isAuthenticated, (req, res) => {
    // Use the authenticated user's ID from session instead of query parameter
    const userId = req.session.userId;

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

// Get user details by ID
app.get('/api/users/:id', isAuthenticated, (req, res) => {
  const userId = req.params.id;

  if (!userId || userId === 'null') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const query = 'SELECT user_id, first_name, last_name, email, phone_number FROM Users WHERE user_id = ?';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(results[0]);
  });
});

// Get appointment details by ID
app.get('/api/appointments/:id', isAuthenticated, (req, res) => {
  const appointmentId = req.params.id;
  
  const query = `
    SELECT a.appointment_id as id, a.appointment_date as date, 
           a.appointment_time as time, a.status, a.additional_notes as notes, 
           s.service_name as service, a.user_id
    FROM Appointments a
    JOIN Services s ON a.service_id = s.service_id
    WHERE a.appointment_id = ?
  `;
  
  db.query(query, [appointmentId], (err, results) => {
    if (err) {
      console.error('Error fetching appointment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(results[0]);
  });
});

// Endpoint to request a password reset
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date(Date.now() + 3600000); // Token valid for 1 hour

    const updateQuery = `UPDATE Users SET reset_token = ?, reset_token_expiration = ? WHERE email = ?`;
    db.query(updateQuery, [token, expiration, email], async (err, result) => {
        if (err) {
            console.error('Error updating reset token:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Email not found' });
        }

        try {
            const resetLink = `${req.protocol}://${req.get('host')}/forgot-password.html?token=${token}`;
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Password Reset Request',
                html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link is valid for 1 hour.</p>`,
            };

            await sendEmail(mailOptions);
            res.json({ success: true, message: 'Password reset email sent' });
        } catch (mailErr) {
            console.error('Error sending email:', mailErr);
            
            // Rollback token update if email fails
            const rollbackQuery = `UPDATE Users SET reset_token = NULL, reset_token_expiration = NULL WHERE email = ?`;
            db.query(rollbackQuery, [email], (rollbackErr) => {
                if (rollbackErr) {
                    console.error('Error rolling back token update:', rollbackErr);
                }
            });
            
            res.status(500).json({ 
                error: 'Failed to send email', 
                details: mailErr.message,
                tip: 'Check your EMAIL_USER and EMAIL_PASS in .env file'
            });
        }
    });
});

// Endpoint to reset the password
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Invalid request' });

    const query = `SELECT * FROM Users WHERE reset_token = ? AND reset_token_expiration > NOW()`;
    db.query(query, [token], async (err, results) => {
        if (err) {
            console.error('Error fetching token:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        try {
            // Use bcrypt for secure password hashing
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const updateQuery = `UPDATE Users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE reset_token = ?`;
            
            db.query(updateQuery, [hashedPassword, token], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating password:', updateErr);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ success: true, message: 'Password reset successfully' });
            });
        } catch (hashErr) {
            console.error('Error hashing password:', hashErr);
            res.status(500).json({ error: 'Server error' });
        }
    });
});

// Test email sending endpoint
app.get('/api/test-email', async (req, res) => {
    const recipient = req.query.email || 'test-recipient@example.com';
    try {
        const result = await sendEmail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: recipient,
            subject: 'Test Email from BUPC Clinic',
            text: 'This is a test email from BUPC Clinic.',
            html: '<h1>Test Email</h1><p>This is a test email from BUPC Clinic.</p>'
        });
        
        if (result.devMode) {
            res.json({ 
                success: true, 
                message: 'Email logged to console (development mode)',
                note: 'EMAIL_USER and EMAIL_PASS not configured in .env file'
            });
        } else {
            res.json({ 
                success: true, 
                message: `Test email sent successfully to ${recipient}!`,
                messageId: result.messageId
            });
        }
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to send test email', 
            details: error.message,
            tip: 'Check your EMAIL_USER and EMAIL_PASS in .env file'
        });
    }
});

// Server startup function that handles port conflicts
const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`Visit http://localhost:${port} in your browser`);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            server.close();
            startServer(port + 1);
        } else {
            console.error('Server error:', e);
        }
    });
};

const PORT = process.env.PORT || 3000;
startServer(PORT);