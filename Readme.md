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