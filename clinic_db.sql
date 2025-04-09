-- Users table to store user profiles
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    user_type ENUM('student', 'staff') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample users
INSERT INTO Users (first_name, last_name, email, phone_number, user_type) VALUES
('John', 'Doe', 'john.doe@example.com', '1234567890', 'student'),
('Jane', 'Smith', 'jane.smith@example.com', '0987654321', 'staff');

-- Services table to store available services
CREATE TABLE Services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample services
INSERT INTO Services (service_name, description) VALUES
('Medical Consultation & Treatment', 'Professional medical consultations and treatments for all BUPC students and staff.'),
('Physical Examination', 'For athletic activities, OJT/internship, extra-curricular activities, and scholarship requirements.'),
('Dental Consultation & Treatment', 'Comprehensive dental care services to maintain your oral health.'),
('Vaccination', 'Annual free Flu & Pneumonia vaccinations to keep our community healthy.');

-- Appointments table to store appointment details
CREATE TABLE Appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_id INT NOT NULL,
    additional_notes TEXT,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE
);

-- Updated TimeSlots table to use is_available instead of status
CREATE TABLE TimeSlots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL, -- Replacing start_time and end_time with a single column
    is_available BOOLEAN DEFAULT TRUE, -- Indicates if the slot is available
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (appointment_date, appointment_time) -- Ensure no duplicate slots for the same date and time
);

-- Stores confirmation details for appointments.
CREATE TABLE AppointmentConfirmations (
    confirmation_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    confirmation_code VARCHAR(20) UNIQUE NOT NULL,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id) ON DELETE CASCADE
);

-- Audit table to track changes in appointment statuses
CREATE TABLE appointment_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    status ENUM('pending', 'approved', 'canceled') NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id) ON DELETE CASCADE
);


