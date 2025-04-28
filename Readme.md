# Simple JS App

A basic Express.js application that serves a "Hello World" style response.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- npm (comes with Node.js)

## Installation

### Windows

1. **Install Node.js and npm**
   - Download and install Node.js from [nodejs.org](https://nodejs.org/)
   - Verify installation by opening Command Prompt and running:
     ```
     node --version
     npm --version
     ```

2. **Clone or download this repository**
   - If using Git: `git clone [your-repository-url]`
   - Or download and extract the ZIP file

3. **Install dependencies**
   - Open Command Prompt
   - Navigate to the project directory: `cd path\to\simple-js-app`
   - Run: `npm install`

4. **Start the application**
   - Run: `node index.js`
   - The server will start on port 3000
   - Access the application at [http://localhost:3000](http://localhost:3000)

### Linux

1. **Install Node.js and npm**
   - Using package manager (Ubuntu/Debian):
     ```bash
     sudo apt update
     sudo apt install nodejs npm
     ```
   - For other distributions, check the [Node.js downloads page](https://nodejs.org/en/download/package-manager/)
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Clone or download this repository**
   - If using Git: `git clone [your-repository-url]`
   - Or download and extract the ZIP file

3. **Install dependencies**
   - Open Terminal
   - Navigate to the project directory: `cd path/to/simple-js-app`
   - Run: `npm install`

4. **Start the application**
   - Run: `node index.js`
   - The server will start on port 3000
   - Access the application at [http://localhost:3000](http://localhost:3000)

## Database Setup

### Installing MySQL

1. **Install MySQL Server**
   ```bash
   sudo apt install mysql-server
   sudo service mysql start
   sudo mysql_secure_installation
   ```

2. **Configure MySQL User**
   ```bash
   sudo mysql
   ```
   
   In the MySQL prompt:
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Create Database and User**
   ```bash
   mysql -u root -p
   ```
   
   In the MySQL prompt:
   ```sql
   CREATE DATABASE clinic_db;
   CREATE USER 'clinic_user'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON clinic_db.* TO 'clinic_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

4. **Install MySQL Node.js Driver**
   ```bash
   npm install mysql2
   ```

## Email Functionality

### Prerequisites

1. Install the required dependencies:
   ```bash
   npm install nodemailer dotenv
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
# Database Configuration
DB_HOST=localhost
DB_USER=clinic_user
DB_PASSWORD=password
DB_NAME=bupc_clinic

# Email Configuration
EMAIL_USER=tiknumberone.1@gmail.com
EMAIL_PASS=ifhg jbqx fofs jjay
EMAIL_SERVICE=Gmail
EMAIL_FROM_NAME=BUPC Clinic System
EMAIL_FROM_ADDRESS=noreply@bupc-clinic.com

# Server Configuration
PORT=3000

   ```

### Forgot Password

1. Users can request a password reset email.
2. A secure token is generated and sent to the user's email.
3. Users can reset their password using the token.

### Email Notifications for Booking

1. Users receive a confirmation email upon booking an appointment.
2. Ensure the `EMAIL_USER` and `EMAIL_PASS` environment variables are set up correctly.

## Setting Up Staff Accounts

### Prerequisites

Before creating a staff account, ensure you have the following installed:

1. **Node.js and npm**
   ```bash
   # Check if Node.js is installed
   node -v
   
   # Check if npm is installed
   npm -v
   
   # If not installed, install them
   sudo apt update
   sudo apt install nodejs npm
   ```

2. **Required Node.js Dependencies**
   ```bash
   # Navigate to the project directory
   cd /home/cj-ubuntu/simple-js-app
   
   # Install required packages
   npm install bcrypt readline
   ```

### Creating a Staff Account (Interactive Method)

1. **Create a staff-creator.js file**
   ```bash
   # Create the file in your project directory
   touch staff-creator.js
   ```

2. **Open the file and paste the provided code**
   ```bash
   # Use your preferred text editor
   nano staff-creator.js
   ```

   Add the following code to the file:
   ```javascript
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
   ```

3. **Run the script to create a staff account**
   ```bash
   # Execute the script
   node staff-creator.js
   ```

4. **Follow the interactive prompts**
   - Enter the staff member's first name
   - Enter the staff member's last name
   - Enter a valid email address
   - Enter a phone number
   - Enter a secure password
   
   The script will:
   - Hash the password securely
   - Check if the email already exists
   - Create a new staff account or update an existing one
   - Provide confirmation of successful creation

### Staff Account Privileges

Staff accounts have the following special privileges:

1. Access to the Nurse Dashboard (/nurse-dashboard)
2. Ability to view all patient appointments
3. Ability to approve or reject pending appointments
4. Ability to manage appointment conflicts

### Existing Test Accounts

The system comes with a default staff account that you can update:

- **Staff User**: Jane Smith
- **Email**: jane.smith@example.com
- You can use the staff-creator.js script to set a password for this account

### Alternative Methods

You can also use one of these simpler methods:

1. **Direct SQL Update** (simplest):
   ```sql
   UPDATE Users 
   SET password = '$2b$10$3n9xBfbTQ0zXcEjrKPT.yOXn9H3QI3JvAWm6AXK4Dv25Wx4c8jnI2' 
   WHERE email = 'jane.smith@example.com';
   ```
   This sets the password to "staffpass123" for the existing Jane Smith account.

2. **Using a Simple Node.js Script**:
   Create a file named create-staff.js with basic functionality to create a staff account with hardcoded values.

## Development

You can add a start script to package.json for easier running:

```json
"scripts": {
  "start": "node index.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

Then use `npm start` to run the application.

## License

ISC