    CREATE DATABASE IF NOT EXISTS eRegistrar;
    USE eRegistrar;

    -- ===========================================================
    -- USERS & ROLES
    -- ===========================================================

    CREATE TABLE users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        account_type ENUM('student','admin') NOT NULL,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB;

    CREATE TABLE roles ( 
        role_id INT AUTO_INCREMENT PRIMARY KEY,
        role_name VARCHAR(100) UNIQUE NOT NULL,
        role_description TEXT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE user_roles (
        user_role_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        assigned_by INT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (role_id) REFERENCES roles(role_id),
        FOREIGN KEY (assigned_by) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE password_resets (
        reset_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );


    -- ===========================================================
    -- COURSES
    -- ===========================================================

    CREATE TABLE courses (
        course_id INT AUTO_INCREMENT PRIMARY KEY,
        course_code VARCHAR(50) UNIQUE NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        course_description TEXT NULL,
        department VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- STUDENT PROFILES
    -- ===========================================================

    CREATE TABLE student_profiles (
        student_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,

        student_number VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100) NULL,
        last_name VARCHAR(100) NOT NULL,
        extension_name VARCHAR(50) NULL,

        birthdate DATE NULL,
        gender ENUM('male','female','other') NULL,
        contact_number VARCHAR(20) NULL,
        profile_picture VARCHAR(255) NULL,

        course_id INT NULL,

        year_level VARCHAR(100) NULL,
        enrollment_status ENUM('enrolled','graduated','dropped','transferred','alumni') DEFAULT 'enrolled',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL,

        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- ADMIN PROFILES
    -- ===========================================================

    CREATE TABLE admin_profiles (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100) NULL,
        last_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- ADDRESS STRUCTURE
    -- ===========================================================

    CREATE TABLE provinces (
        province_id INT AUTO_INCREMENT PRIMARY KEY,
        province_name VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE municipalities (
        municipality_id INT AUTO_INCREMENT PRIMARY KEY,
        province_id INT NOT NULL,
        municipality_name VARCHAR(255) NOT NULL,
        FOREIGN KEY (province_id) REFERENCES provinces(province_id)
    ) ENGINE=InnoDB;

    CREATE TABLE barangays (
        barangay_id INT AUTO_INCREMENT PRIMARY KEY,
        municipality_id INT NOT NULL,
        barangay_name VARCHAR(255) NOT NULL,
        FOREIGN KEY (municipality_id) REFERENCES municipalities(municipality_id)
    ) ENGINE=InnoDB;

    CREATE TABLE student_addresses (
        address_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,

        address_type ENUM('current','permanent') NOT NULL,

        province_id INT NOT NULL,
        municipality_id INT NOT NULL,
        barangay_id INT NOT NULL,

        street TEXT NULL,
        postal_code VARCHAR(10) NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
        FOREIGN KEY (province_id) REFERENCES provinces(province_id),
        FOREIGN KEY (municipality_id) REFERENCES municipalities(municipality_id),
        FOREIGN KEY (barangay_id) REFERENCES barangays(barangay_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- GUARDIANS
    -- ===========================================================

    CREATE TABLE student_guardians (
        guardian_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,

        guardian_type ENUM('father','mother','guardian','other') NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20) NULL,
        occupation VARCHAR(255) NULL,
        email VARCHAR(255) NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (student_id) REFERENCES student_profiles(student_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- DOCUMENT TYPES & REQUESTS
    -- ===========================================================

    CREATE TABLE document_types (
        document_type_id INT AUTO_INCREMENT PRIMARY KEY,
        document_name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        requirements TEXT NULL,
        estimated_processing_days INT NOT NULL DEFAULT 1,
        is_active TINYINT(1) DEFAULT 1,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

CREATE TABLE document_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    document_type_id INT NOT NULL,

    purpose VARCHAR(255) NOT NULL,
    delivery_method ENUM('pickup','delivery','email') NOT NULL,
    delivery_address TEXT NULL,
    quantity INT NOT NULL DEFAULT 1,

    total_amount DECIMAL(10,2) NOT NULL,

    request_status ENUM(
        'pending',
        'processing',
        'releasing',
        'completed',
        'rejected'
    ) DEFAULT 'pending',

    rejection_reason TEXT NULL,
    rejected_by INT NULL,
    rejected_at TIMESTAMP NULL,

    expires_at DATETIME NOT NULL,
    is_archived TINYINT(1) DEFAULT 0,
    archived_at TIMESTAMP NULL,

    admin_id INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
    FOREIGN KEY (document_type_id) REFERENCES document_types(document_type_id),
    FOREIGN KEY (admin_id) REFERENCES admin_profiles(admin_id),
    FOREIGN KEY (rejected_by) REFERENCES admin_profiles(admin_id)
) ENGINE=InnoDB;

CREATE TABLE request_status_logs (
    status_log_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,

    status ENUM(
        'pending',
        'processing',
        'releasing',
        'completed',
        'rejected'
    ) NOT NULL,

    message TEXT NOT NULL,

    created_by INT NULL, -- NULL = system action
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,

    FOREIGN KEY (request_id) REFERENCES document_requests(request_id),
    FOREIGN KEY (created_by) REFERENCES admin_profiles(admin_id)
) ENGINE=InnoDB;

    -- ===========================================================
    -- PAYMENTS
    -- ===========================================================
    CREATE TABLE payment_methods (
        method_id INT AUTO_INCREMENT PRIMARY KEY,
        method_name VARCHAR(100) NOT NULL,   
        send_to VARCHAR(255) NOT NULL,
        sender_name VARCHAR(100) NOT NULL,       
        is_active TINYINT(1) DEFAULT 1,       
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE payment_batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending','paid','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id)
    );


    CREATE TABLE payments (
        payment_id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NULL,
        request_id INT NULL,

        student_id INT NOT NULL,

        amount DECIMAL(10,2) NOT NULL,
        method_id INT NOT NULL,
        payment_proof VARCHAR(255) NULL,

        payment_status ENUM(
            'pending',
            'submitted',
            'verified',
            'rejected',
            'refunded'
        ) DEFAULT 'pending',

        verified_by INT NULL,
        verified_at TIMESTAMP NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (batch_id)
            REFERENCES payment_batches(batch_id)
            ON DELETE SET NULL,

        FOREIGN KEY (request_id)
            REFERENCES document_requests(request_id)
            ON DELETE SET NULL,

        FOREIGN KEY (student_id)
            REFERENCES student_profiles(student_id),

        FOREIGN KEY (method_id)
            REFERENCES payment_methods(method_id),

        FOREIGN KEY (verified_by)
            REFERENCES admin_profiles(admin_id),

        CONSTRAINT chk_payment_reference
        CHECK (
            (batch_id IS NOT NULL AND request_id IS NULL)
            OR
            (batch_id IS NULL AND request_id IS NOT NULL)
        )
    ) ENGINE=InnoDB;


CREATE TABLE batch_requests (
  batch_request_id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  request_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (batch_id)
    REFERENCES payment_batches(batch_id)
    ON DELETE CASCADE,

  FOREIGN KEY (request_id)
    REFERENCES document_requests(request_id)
    ON DELETE CASCADE,

  UNIQUE KEY uniq_batch_request (batch_id, request_id)
) ENGINE=InnoDB;



    -- ===========================================================
    -- REFUND REQUEST
    -- ===========================================================
    CREATE TABLE refund_requests (
    refund_id INT AUTO_INCREMENT PRIMARY KEY,

    payment_id INT NOT NULL,
    request_id INT NOT NULL,
    student_id INT NOT NULL,

    reason TEXT NOT NULL,

    refund_status ENUM(
        'pending',
        'approved',
        'denied',
        'released'
    ) DEFAULT 'pending',

    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    released_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    FOREIGN KEY (request_id) REFERENCES document_requests(request_id),
    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
    FOREIGN KEY (reviewed_by) REFERENCES admin_profiles(admin_id)
) ENGINE=InnoDB;

    -- ===========================================================
    -- RECIEPT
    -- ===========================================================
    CREATE TABLE receipts (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,

    receipt_reference VARCHAR(50) NOT NULL UNIQUE,

    batch_id INT NOT NULL,
    student_id INT NOT NULL,

    total_paid DECIMAL(10,2) NOT NULL,
    completed_amount DECIMAL(10,2) NOT NULL,
    rejected_amount DECIMAL(10,2) NOT NULL,
    refundable_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    currency VARCHAR(10) NOT NULL DEFAULT 'PHP',

    issued_at DATETIME NOT NULL COMMENT 'Asia/Manila time',
    issued_by INT NULL COMMENT 'User who generated receipt',

    receipt_status ENUM(
        'issued',
        'voided'
    ) DEFAULT 'issued',

    pdf_path VARCHAR(255) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES payment_batches(batch_id),
    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
    FOREIGN KEY (issued_by) REFERENCES users(user_id),

    UNIQUE KEY uniq_receipt_batch (batch_id)
) ENGINE=InnoDB;

CREATE TABLE receipt_items (
    receipt_item_id INT AUTO_INCREMENT PRIMARY KEY,

    receipt_id INT NOT NULL,
    request_id INT NOT NULL,

    document_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,

    request_status ENUM(
        'completed',
        'rejected'
    ) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id)
        ON DELETE CASCADE,

    FOREIGN KEY (request_id) REFERENCES document_requests(request_id)
) ENGINE=InnoDB;


    -- ===========================================================
    -- NOTIFICATIONS
    -- ===========================================================
    CREATE TABLE refund_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,

    refund_id INT NOT NULL,

    old_status ENUM('pending','approved','denied','released'),
    new_status ENUM('pending','approved','denied','released'),

    changed_by INT NULL,
    note TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (refund_id) REFERENCES refund_requests(refund_id),
    FOREIGN KEY (changed_by) REFERENCES admin_profiles(admin_id)
) ENGINE=InnoDB;

    -- ===========================================================
    -- NOTIFICATIONS
    -- ===========================================================

CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  type ENUM('request_update','payment_update','system') NOT NULL,

  status VARCHAR(50) NULL,  

  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

    -- ===========================================================
    -- SYSTEM SETTINGS (SCHOOL INFORMATION)
    -- ===========================================================
    CREATE TABLE system_settings (
        id INT PRIMARY KEY DEFAULT 1,

        school_name VARCHAR(255) NOT NULL,
        school_short_name VARCHAR(50) NOT NULL,
        school_email VARCHAR(255) NOT NULL,
        school_contact_number VARCHAR(50) NOT NULL,
        school_address TEXT NOT NULL,
        school_website VARCHAR(255) NULL,

        school_logo VARCHAR(255) NULL,
        school_seal VARCHAR(255) NULL,
        school_icon VARCHAR(255) NULL,

        updated_by INT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (updated_by) REFERENCES users(user_id)
    ) ENGINE=InnoDB;


    -- ===========================================================
    -- ANNOUNCEMENTS
    -- ===========================================================
    CREATE TABLE announcements (
        announcement_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        posted_by VARCHAR(255) NOT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL,

        FOREIGN KEY (created_by) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- AUDIT LOGS
    -- ===========================================================

    CREATE TABLE audit_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NULL,
        record_id INT NULL,
        old_value JSON NULL,
        new_value JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50) NULL,
        user_agent TEXT NULL,

        FOREIGN KEY (user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- Payment LOGS
    -- ===========================================================

    CREATE TABLE payment_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    old_status ENUM('pending','submitted','verified','rejected','refunded'),
    new_status ENUM('pending','submitted','verified','rejected','refunded'),
    changed_by INT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    FOREIGN KEY (changed_by) REFERENCES admin_profiles(admin_id)
    );

    -- Insert roles
    INSERT IGNORE INTO roles (role_name, role_description) VALUES
    ('admin', 'Full system administrator with all privileges'),
    ('student', 'Registered student user with limited access'),
    ('registrar', 'Registrar staff who manages course registrations and records');

    -- SYSTEM SETTINGS (SCHOOL INFORMATION)
    INSERT INTO system_settings (
        school_name,
        school_short_name,
        school_email,
        school_contact_number,
        school_address,
        school_website,
        school_logo,
        school_seal,
        school_icon,
        updated_by
    ) VALUES (
        'Trinidad Municipal College',
        'TMC',
        'registrar@tmc.edu.ph',
        '+63 917 123 4567',
        'Poblacion, Trinidad, Bohol',
        'https://tmc.edu.ph',
        '/uploads/system/logo.png',
        '/uploads/system/seal.png',
        '/uploads/system/icon.png',
        NULL
    );
