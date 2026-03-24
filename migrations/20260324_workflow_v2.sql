CREATE TABLE IF NOT EXISTS workflow_colleges (
  college_id INT AUTO_INCREMENT PRIMARY KEY,
  college_code VARCHAR(50) NULL,
  college_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  college_id INT NOT NULL,
  department_code VARCHAR(50) NULL,
  department_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_course_scopes (
  course_scope_id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL UNIQUE,
  college_id INT NULL,
  department_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(course_id),
  FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id),
  FOREIGN KEY (department_id) REFERENCES workflow_departments(department_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_dean_assignments (
  dean_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS workflow_college_admin_assignments (
  college_admin_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  college_id INT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_requests (
  workflow_request_id INT AUTO_INCREMENT PRIMARY KEY,
  request_reference VARCHAR(50) NOT NULL UNIQUE,
  student_id INT NOT NULL,
  student_user_id INT NOT NULL,
  dean_user_id INT NULL,
  college_admin_user_id INT NULL,
  current_status VARCHAR(64) NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  delivery_method VARCHAR(20) NOT NULL,
  form_snapshot_json JSON NOT NULL,
  educational_background_json JSON NOT NULL,
  academic_snapshot_json JSON NOT NULL,
  approval_snapshot_json JSON NULL,
  fee_snapshot_json JSON NULL,
  payment_snapshot_json JSON NULL,
  release_snapshot_json JSON NULL,
  submitted_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
  FOREIGN KEY (student_user_id) REFERENCES users(user_id),
  FOREIGN KEY (dean_user_id) REFERENCES users(user_id),
  FOREIGN KEY (college_admin_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_request_items (
  workflow_request_item_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_request_id INT NOT NULL,
  document_type_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
  FOREIGN KEY (document_type_id) REFERENCES document_types(document_type_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_request_actions (
  workflow_request_action_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_request_id INT NOT NULL,
  action_role VARCHAR(100) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  from_status VARCHAR(64) NULL,
  to_status VARCHAR(64) NULL,
  remarks TEXT NULL,
  payload_json JSON NULL,
  acted_by_user_id INT NOT NULL,
  acted_at DATETIME NOT NULL,
  FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
  FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_request_approvals (
  workflow_request_approval_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_request_id INT NOT NULL,
  approval_stage VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  acted_by_user_id INT NOT NULL,
  remarks TEXT NULL,
  acted_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
  FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_fee_assessments (
  workflow_fee_assessment_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_request_id INT NOT NULL,
  assessment_version INT NOT NULL,
  base_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  policy_type VARCHAR(64) NOT NULL DEFAULT 'ALWAYS_PAID',
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  waiver_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  surcharge_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
  assessment_notes TEXT NULL,
  assessed_by_user_id INT NOT NULL,
  assessed_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
  FOREIGN KEY (assessed_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_generated_documents (
  workflow_generated_document_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_request_id INT NOT NULL,
  version_number INT NOT NULL,
  source_status VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  generated_by_user_id INT NOT NULL,
  generated_at DATETIME NOT NULL,
  FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_release_records (
  workflow_release_record_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_request_id INT NOT NULL,
  workflow_generated_document_id INT NULL,
  release_method VARCHAR(32) NOT NULL,
  release_status VARCHAR(64) NOT NULL,
  prepared_by_user_id INT NULL,
  released_by_user_id INT NULL,
  released_at DATETIME NULL,
  recipient_name VARCHAR(255) NULL,
  recipient_email VARCHAR(255) NULL,
  authorized_representative_name VARCHAR(255) NULL,
  authorized_representative_id_type VARCHAR(100) NULL,
  authorized_representative_id_number VARCHAR(100) NULL,
  courier_name VARCHAR(255) NULL,
  tracking_number VARCHAR(255) NULL,
  dispatch_at DATETIME NULL,
  delivery_confirmed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_generated_document_id) REFERENCES workflow_generated_documents(workflow_generated_document_id),
  FOREIGN KEY (prepared_by_user_id) REFERENCES users(user_id),
  FOREIGN KEY (released_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_release_claim_logs (
  workflow_release_claim_log_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_request_id INT NOT NULL,
  workflow_release_record_id INT NULL,
  event_type VARCHAR(64) NOT NULL,
  remarks TEXT NULL,
  metadata_json JSON NULL,
  acted_by_user_id INT NOT NULL,
  acted_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_release_record_id) REFERENCES workflow_release_records(workflow_release_record_id) ON DELETE SET NULL,
  FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
