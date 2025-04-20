/**
 * Interactive Staff Account Creator
 * Run with: node staff-creator.js
 */

const bcrypt = require('bcrypt');
const readline = require('readline');
const db = require('./db');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for staff details
function promptStaffDetails() {
  console.log('\n===== BUPC Clinic Staff Account Creation =====\n');
  
  rl.question('First Name: ', (firstName) => {
    rl.question('Last Name: ', (lastName) => {
      rl.question('Email: ', (email) => {
        rl.question('Phone Number: ', (phone) => {
          rl.question('Password: ', async (password) => {
            try {
              // Hash the password
              const hashedPassword = await bcrypt.hash(password, 10);
              
              // Check if email exists
              db.query('SELECT user_id FROM Users WHERE email = ?', [email], (err, results) => {
                if (err) {
                  console.error('Error checking email:', err);
                  closeAndExit();
                  return;
                }
                
                if (results.length > 0) {
                  console.log('\nEmail already exists. Update password? (y/n)');
                  rl.question('> ', (answer) => {
                    if (answer.toLowerCase() === 'y') {
                      updatePassword(email, hashedPassword);
                    } else {
                      console.log('Operation cancelled.');
                      closeAndExit();
                    }
                  });
                  return;
                }
                
                // Create new staff user
                createStaffUser(firstName, lastName, email, phone, hashedPassword);
              });
            } catch (error) {
              console.error('Error hashing password:', error);
              closeAndExit();
            }
          });
        });
      });
    });
  });
}

// Create staff user function
function createStaffUser(firstName, lastName, email, phone, hashedPassword) {
  db.query(
    'INSERT INTO Users (first_name, last_name, email, phone_number, password, user_type) VALUES (?, ?, ?, ?, ?, "staff")',
    [firstName, lastName, email, phone, hashedPassword],
    (err, result) => {
      if (err) {
        console.error('Error creating staff account:', err);
      } else {
        console.log('\n✅ Staff account created successfully!');
        console.log(`User ID: ${result.insertId}`);
        console.log(`Name: ${firstName} ${lastName}`);
        console.log(`Email: ${email}`);
      }
      closeAndExit();
    }
  );
}

// Update password function
function updatePassword(email, hashedPassword) {
  db.query(
    'UPDATE Users SET password = ? WHERE email = ?',
    [hashedPassword, email],
    (err) => {
      if (err) {
        console.error('Error updating password:', err);
      } else {
        console.log(`\n✅ Password updated for ${email}`);
      }
      closeAndExit();
    }
  );
}

// Close connections and exit
function closeAndExit() {
  rl.close();
  db.end();
}

// Start the program
promptStaffDetails();
