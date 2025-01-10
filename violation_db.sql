-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: localhost    Database: violation_db
-- ------------------------------------------------------
-- Server version	8.0.36

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `fine_print_log`
--

DROP TABLE IF EXISTS `fine_print_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fine_print_log` (
  `Fine_Violation_Report_ID` int NOT NULL,
  `Printer_Staff_ID` varchar(20) DEFAULT NULL,
  `Print_Timestamp` datetime DEFAULT NULL,
  `Processor_IP` varchar(20) DEFAULT NULL,
  `Fine_Image` varchar(50) DEFAULT NULL,
  `status` varchar(45) DEFAULT '待處理',
  PRIMARY KEY (`Fine_Violation_Report_ID`),
  KEY `Printer_Staff_ID_idx` (`Printer_Staff_ID`),
  CONSTRAINT `Fine_Violation_Report_ID` FOREIGN KEY (`Fine_Violation_Report_ID`) REFERENCES `national_case_report` (`National_Violation_Report_ID`),
  CONSTRAINT `Printer_Staff_ID` FOREIGN KEY (`Printer_Staff_ID`) REFERENCES `users_info` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fine_print_log`
--

LOCK TABLES `fine_print_log` WRITE;
/*!40000 ALTER TABLE `fine_print_log` DISABLE KEYS */;
INSERT INTO `fine_print_log` VALUES (1,'tp001','2025-01-11 02:27:01','127.0.0.1','AFF-0666_20240110000000.png','待處理'),(3,'tp001','2025-01-11 02:27:38','127.0.0.1','BGR-5851_20240110000200_stamped.png','已列印');
/*!40000 ALTER TABLE `fine_print_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `fineview`
--

DROP TABLE IF EXISTS `fineview`;
/*!50001 DROP VIEW IF EXISTS `fineview`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `fineview` AS SELECT 
 1 AS `National_Violation_Report_ID`,
 1 AS `Owner_Name`,
 1 AS `Vehicle_Registration_Type`,
 1 AS `Owner_Address`,
 1 AS `License_Plate`,
 1 AS `Record_Timestamp`,
 1 AS `Violation_Location`,
 1 AS `Speed_Limit`,
 1 AS `Vehicle_Speed`,
 1 AS `Image`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `manual_recognition_log`
--

DROP TABLE IF EXISTS `manual_recognition_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `manual_recognition_log` (
  `MR_Violation_Report_ID` int NOT NULL,
  `Staff_ID` varchar(20) NOT NULL,
  `Processor_ID` varchar(20) DEFAULT NULL,
  `Timestamp` datetime DEFAULT NULL,
  `Event_Type` varchar(15) DEFAULT NULL,
  `License_Plate` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`MR_Violation_Report_ID`,`Staff_ID`),
  KEY `Staff_ID_idx` (`Staff_ID`),
  CONSTRAINT `MR_Violation_Report_ID` FOREIGN KEY (`MR_Violation_Report_ID`) REFERENCES `national_case_report` (`National_Violation_Report_ID`),
  CONSTRAINT `Staff_ID` FOREIGN KEY (`Staff_ID`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `manual_recognition_log`
--

LOCK TABLES `manual_recognition_log` WRITE;
/*!40000 ALTER TABLE `manual_recognition_log` DISABLE KEYS */;
INSERT INTO `manual_recognition_log` VALUES (3,'U01','127.0.0.1','2025-01-11 02:11:36','correct','BGR-5851'),(4,'U01','127.0.0.1','2025-01-11 02:12:27','correct',NULL),(6,'U01','127.0.0.1','2025-01-11 02:14:24','correct',NULL),(7,'U01','127.0.0.1','2025-01-11 02:14:27','correct',NULL),(11,'U01','127.0.0.1','2025-01-11 02:14:33','correct','PKX-628');
/*!40000 ALTER TABLE `manual_recognition_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `motc_vehicle`
--

DROP TABLE IF EXISTS `motc_vehicle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `motc_vehicle` (
  `License_Plate` varchar(10) NOT NULL,
  `Owner_Name` varchar(30) DEFAULT NULL,
  `Vehicle_Registration_Type` varchar(20) DEFAULT NULL,
  `Owner_Address` varchar(225) DEFAULT NULL,
  `Vehicle_Status_Code` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`License_Plate`),
  UNIQUE KEY `License_Plate_UNIQUE` (`License_Plate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `motc_vehicle`
--

LOCK TABLES `motc_vehicle` WRITE;
/*!40000 ALTER TABLE `motc_vehicle` DISABLE KEYS */;
INSERT INTO `motc_vehicle` VALUES ('AFF-0666','劉阿豪','小客車','桃園市八德區永福路8號','LEG'),('BGR-5851','劉土豪','小客車','桃園市缺德路87號','LEG');
/*!40000 ALTER TABLE `motc_vehicle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `national_case_report`
--

DROP TABLE IF EXISTS `national_case_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `national_case_report` (
  `National_Case_ID` int NOT NULL AUTO_INCREMENT,
  `National_Violation_Report_ID` int NOT NULL,
  `Lamp_Post_ID` varchar(45) NOT NULL,
  `Speed_Limit` int DEFAULT NULL,
  `Vehicle_Speed` int DEFAULT NULL,
  `Violation_Location` varchar(225) DEFAULT NULL,
  `Record_Timestamp` datetime DEFAULT NULL,
  `Image` varchar(20) DEFAULT NULL,
  `Longitude` varchar(45) DEFAULT NULL,
  `Latitude` varchar(45) DEFAULT NULL,
  `License_Plate` varchar(10) DEFAULT NULL,
  `Recognition_Result` varchar(5) DEFAULT NULL,
  `Final_Response_Time` datetime DEFAULT NULL,
  `Owner_Confirmation_Time` datetime DEFAULT NULL,
  `Vehicle_Status_Code` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`National_Case_ID`,`National_Violation_Report_ID`),
  UNIQUE KEY `Violation_Report_ID_UNIQUE` (`National_Violation_Report_ID`),
  UNIQUE KEY `National_Case_ID_UNIQUE` (`National_Case_ID`),
  UNIQUE KEY `Image_UNIQUE` (`Image`),
  CONSTRAINT `National_Violation_Report_ID` FOREIGN KEY (`National_Case_ID`) REFERENCES `violation_record` (`Violation_Report_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `national_case_report`
--

LOCK TABLES `national_case_report` WRITE;
/*!40000 ALTER TABLE `national_case_report` DISABLE KEYS */;
/*!40000 ALTER TABLE `national_case_report` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` varchar(20) NOT NULL,
  `full_name` varchar(10) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(50) NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username_UNIQUE` (`username`),
  UNIQUE KEY `password_UNIQUE` (`password`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('U01','王曉明','U1111','U1111');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_info`
--

DROP TABLE IF EXISTS `users_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_info` (
  `user_id` varchar(20) NOT NULL,
  `full_name` varchar(10) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(128) NOT NULL,
  `salt` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username_UNIQUE` (`username`),
  UNIQUE KEY `password_UNIQUE` (`password`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_info`
--

LOCK TABLES `users_info` WRITE;
/*!40000 ALTER TABLE `users_info` DISABLE KEYS */;
INSERT INTO `users_info` VALUES ('tp001','王小美','ab1111','221b74be478010f1f2c059da687db3ffb193b8f4d14d3a4afa9d21e23e0e70cf','d8a4e0c78256a4aad66c8c7a4f674cc5');
/*!40000 ALTER TABLE `users_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_registration`
--

DROP TABLE IF EXISTS `vehicle_registration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_registration` (
  `Violation_Report_ID` int NOT NULL,
  `License_Plate` varchar(10) NOT NULL,
  `Owner_Name` varchar(30) DEFAULT NULL,
  `Vehicle_Registration_Type` varchar(20) DEFAULT NULL,
  `Owner_Address` varchar(255) DEFAULT NULL,
  `Vehicle_Status_Code` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`Violation_Report_ID`,`License_Plate`),
  UNIQUE KEY `Violation_Report_ID_UNIQUE` (`Violation_Report_ID`),
  CONSTRAINT `Violation_Report_ID` FOREIGN KEY (`Violation_Report_ID`) REFERENCES `violation_record` (`Violation_Report_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_registration`
--

LOCK TABLES `vehicle_registration` WRITE;
/*!40000 ALTER TABLE `vehicle_registration` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_registration` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `violation_record`
--

DROP TABLE IF EXISTS `violation_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `violation_record` (
  `Violation_Report_ID` int NOT NULL AUTO_INCREMENT,
  `Lamp_Post_ID` varchar(45) NOT NULL,
  `Speed_Limit` int DEFAULT NULL,
  `Vehicle_Speed` int DEFAULT NULL,
  `Violation_Location` varchar(225) DEFAULT NULL,
  `Record_Timestamp` datetime DEFAULT NULL,
  `Image` varchar(20) DEFAULT NULL,
  `Longitude` varchar(45) DEFAULT NULL,
  `Latitude` varchar(45) DEFAULT NULL,
  `License_Plate` varchar(10) DEFAULT NULL,
  `Recognition_Result` varchar(5) DEFAULT NULL,
  `Final_Response_Time` datetime DEFAULT NULL,
  PRIMARY KEY (`Violation_Report_ID`),
  UNIQUE KEY ` Violation_Report_ID_UNIQUE` (`Violation_Report_ID`),
  UNIQUE KEY `Image_UNIQUE` (`Image`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `violation_record`
--

LOCK TABLES `violation_record` WRITE;
/*!40000 ALTER TABLE `violation_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `violation_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `fineview`
--

/*!50001 DROP VIEW IF EXISTS `fineview`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `fineview` AS select `ncr`.`National_Violation_Report_ID` AS `National_Violation_Report_ID`,`vr`.`Owner_Name` AS `Owner_Name`,`vr`.`Vehicle_Registration_Type` AS `Vehicle_Registration_Type`,`vr`.`Owner_Address` AS `Owner_Address`,`ncr`.`License_Plate` AS `License_Plate`,`ncr`.`Record_Timestamp` AS `Record_Timestamp`,`ncr`.`Violation_Location` AS `Violation_Location`,`ncr`.`Speed_Limit` AS `Speed_Limit`,`ncr`.`Vehicle_Speed` AS `Vehicle_Speed`,`ncr`.`Image` AS `Image` from (`national_case_report` `ncr` join `vehicle_registration` `vr` on((`ncr`.`National_Violation_Report_ID` = `vr`.`Violation_Report_ID`))) where (`ncr`.`Vehicle_Status_Code` = 'LEG') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-01-11  3:02:36
