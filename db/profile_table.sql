-- Add Profiles table to store detailed user information
CREATE TABLE IF NOT EXISTS Profiles (
    profile_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_type VARCHAR(10),
    height FLOAT,
    weight FLOAT,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    emergency_contact_relationship VARCHAR(100) NOT NULL,
    has_insurance BOOLEAN DEFAULT FALSE,
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    known_allergies TEXT,
    medical_conditions TEXT,
    guardian_name VARCHAR(255),
    guardian_contact VARCHAR(20),
    guardian_relationship VARCHAR(100),
    profile_completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Add profile_completed column to Users table to easily check profile status
ALTER TABLE Users 
ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE AFTER user_type;
