-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: clinic_db
-- ------------------------------------------------------
-- Server version	8.0.41-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `AppointmentConfirmations`
--

DROP TABLE IF EXISTS `AppointmentConfirmations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AppointmentConfirmations` (
  `confirmation_id` int NOT NULL AUTO_INCREMENT,
  `appointment_id` int NOT NULL,
  `confirmation_code` varchar(20) NOT NULL,
  `confirmed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`confirmation_id`),
  UNIQUE KEY `confirmation_code` (`confirmation_code`),
  KEY `appointment_id` (`appointment_id`),
  CONSTRAINT `AppointmentConfirmations_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `Appointments` (`appointment_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AppointmentConfirmations`
--

LOCK TABLES `AppointmentConfirmations` WRITE;
/*!40000 ALTER TABLE `AppointmentConfirmations` DISABLE KEYS */;
INSERT INTO `AppointmentConfirmations` VALUES (1,1,'BUPC-2025-1','2025-04-13 04:31:21'),(2,2,'BUPC-2025-2','2025-04-13 04:33:30'),(3,3,'BUPC-2025-3','2025-04-13 04:43:31'),(4,4,'BUPC-2025-4','2025-04-13 04:52:21'),(5,5,'BUPC-2025-5','2025-04-13 04:52:30'),(6,6,'BUPC-2025-6','2025-04-13 04:54:45'),(7,7,'BUPC-2025-7','2025-04-13 04:54:55'),(8,8,'BUPC-2025-8','2025-04-13 08:31:08'),(9,9,'BUPC-2025-9','2025-04-14 08:37:56');
/*!40000 ALTER TABLE `AppointmentConfirmations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Appointments`
--

DROP TABLE IF EXISTS `Appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Appointments` (
  `appointment_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `service_id` int NOT NULL,
  `additional_notes` text,
  `status` enum('pending','confirmed','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`appointment_id`),
  KEY `user_id` (`user_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `Appointments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `Appointments_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `Services` (`service_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Appointments`
--

LOCK TABLES `Appointments` WRITE;
/*!40000 ALTER TABLE `Appointments` DISABLE KEYS */;
INSERT INTO `Appointments` VALUES (1,1,'2025-04-30','11:00:00',1,'i want to play','confirmed','2025-04-13 04:31:21'),(2,1,'2025-04-30','16:00:00',1,'well i want to see beautiful nurse','cancelled','2025-04-13 04:33:30'),(3,1,'2025-04-14','09:00:00',2,'-','confirmed','2025-04-13 04:43:31'),(4,1,'2025-04-17','11:00:00',2,'-','confirmed','2025-04-13 04:52:21'),(5,1,'2025-04-17','11:00:00',2,'-','cancelled','2025-04-13 04:52:30'),(6,1,'2025-04-16','11:00:00',2,'-','cancelled','2025-04-13 04:54:45'),(7,1,'2025-04-16','11:00:00',2,'-','confirmed','2025-04-13 04:54:55'),(8,4,'2025-04-14','11:00:00',1,'-','pending','2025-04-13 08:31:08'),(9,4,'2025-04-15','10:00:00',2,'-','pending','2025-04-14 08:37:55');
/*!40000 ALTER TABLE `Appointments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Services`
--

DROP TABLE IF EXISTS `Services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Services` (
  `service_id` int NOT NULL AUTO_INCREMENT,
  `service_name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`service_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Services`
--

LOCK TABLES `Services` WRITE;
/*!40000 ALTER TABLE `Services` DISABLE KEYS */;
INSERT INTO `Services` VALUES (1,'Medical Consultation & Treatment','Professional medical consultations and treatments for all BUPC students and staff.','2025-04-09 10:41:11'),(2,'Physical Examination','For athletic activities, OJT/internship, extra-curricular activities, and scholarship requirements.','2025-04-09 10:41:11'),(3,'Dental Consultation & Treatment','Comprehensive dental care services to maintain your oral health.','2025-04-09 10:41:11'),(4,'Vaccination','Annual free Flu & Pneumonia vaccinations to keep our community healthy.','2025-04-09 10:41:11');
/*!40000 ALTER TABLE `Services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `user_type` enum('student','staff') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (1,'John','Doe','john.doe@example.com','1234567890','','student','2025-04-09 10:41:10'),(2,'Jane','Smith','jane.smith@example.com','0987654321','','staff','2025-04-09 10:41:10'),(4,'cj','doe','cj.doe@example.com','123456789','','student','2025-04-13 08:27:22'),(5,'Third ','Student','sample@mail.com','01234567891','$2b$10$UO4M.iaJx.cQvKmdb4u1UuqjUU81/imRRr/lvHE.LEZK/OFH0Ywr6','student','2025-04-20 00:51:45');
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appointment_audit`
--

DROP TABLE IF EXISTS `appointment_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointment_audit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `appointment_id` int NOT NULL,
  `status` enum('pending','approved','canceled') NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `appointment_id` (`appointment_id`),
  CONSTRAINT `appointment_audit_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `Appointments` (`appointment_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointment_audit`
--

LOCK TABLES `appointment_audit` WRITE;
/*!40000 ALTER TABLE `appointment_audit` DISABLE KEYS */;
INSERT INTO `appointment_audit` VALUES (1,6,'canceled','2025-04-13 02:36:15');
/*!40000 ALTER TABLE `appointment_audit` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-04-20  9:01:49
