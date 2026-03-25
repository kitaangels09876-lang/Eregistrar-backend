CREATE TABLE IF NOT EXISTS workflow_request_attachments (
  workflow_request_attachment_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_request_id INT NOT NULL,
  attachment_label VARCHAR(255) NULL,
  original_file_name VARCHAR(255) NOT NULL,
  stored_file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NULL,
  file_size BIGINT NULL,
  uploaded_by_user_id INT NOT NULL,
  uploaded_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
