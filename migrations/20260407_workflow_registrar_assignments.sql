CREATE TABLE IF NOT EXISTS workflow_registrar_assignments (
  registrar_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NULL,
  department_id INT NULL,
  college_id INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (course_id) REFERENCES courses(course_id),
  FOREIGN KEY (department_id) REFERENCES workflow_departments(department_id),
  FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
) ENGINE=InnoDB;
