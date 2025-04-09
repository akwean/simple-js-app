const mysql = require('mysql2')


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'clinic_user',
    password: 'password',
    database: 'clinic_db'
});

connection.connect((err) => {
    if(err) {
        console.error('Error connecting to Mysql:', err);
        return;
    }
    console.log('Connected to MySQL database!');
});

module.exports = connection;