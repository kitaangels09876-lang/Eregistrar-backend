--------------------------------------------------
##Activity log
--------------------------------------------------

#Prerequisites
    -Autorization
        No Auth
    -Headers (add)
        Key:Authorization
        Value:Bearer paste your generated token here
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/activity-logs

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
// ============================================================
// SAMPLE 1: Basic Request (No Filters)
// GET /api/activity-logs
// ============================================================
{
  "status": "success",
  "data": {
    "logs": [
      {
        "log_id": 15,
        "user_id": 2,
        "action": "APPROVE_DOCUMENT_REQUEST",
        "table_name": "document_requests",
        "record_id": 45,
        "old_value": {
          "request_status": "pending_verification"
        },
        "new_value": {
          "request_status": "processing",
          "admin_id": 2
        },
        "timestamp": "2025-12-23T14:30:25.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 14,
        "user_id": 3,
        "action": "VIEW_DASHBOARD_SUMMARY",
        "table_name": "document_requests",
        "record_id": null,
        "old_value": null,
        "new_value": {
          "totalRequests": 150,
          "totalStudents": 500,
          "totalCompleted": 120,
          "totalRevenue": 25000
        },
        "timestamp": "2025-12-23T14:15:10.000Z",
        "ip_address": "192.168.1.102",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "user_email": "registrar@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Juan Dela Cruz"
      },
      {
        "log_id": 13,
        "user_id": 2,
        "action": "UPDATE_STUDENT_PROFILE",
        "table_name": "student_profiles",
        "record_id": 123,
        "old_value": {
          "first_name": "John",
          "last_name": "Doe",
          "year_level": "2nd",
          "enrollment_status": "enrolled"
        },
        "new_value": {
          "first_name": "Jonathan",
          "last_name": "Doe",
          "year_level": "3rd",
          "enrollment_status": "enrolled"
        },
        "timestamp": "2025-12-23T13:45:30.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 12,
        "user_id": 2,
        "action": "VERIFY_PAYMENT",
        "table_name": "payments",
        "record_id": 78,
        "old_value": {
          "payment_status": "submitted",
          "verified_by": null
        },
        "new_value": {
          "payment_status": "verified",
          "verified_by": 2,
          "verified_at": "2025-12-23T13:30:00.000Z"
        },
        "timestamp": "2025-12-23T13:30:15.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 11,
        "user_id": 2,
        "action": "USER_LOGIN",
        "table_name": "users",
        "record_id": 2,
        "old_value": null,
        "new_value": null,
        "timestamp": "2025-12-23T13:00:05.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}

// ============================================================
// SAMPLE 2: Filtered by Action
// GET http://localhost:3001/api/activity-logs?action=LOGIN&page=1&limit=10
// ============================================================
{
  "status": "success",
  "data": {
    "logs": [
      {
        "log_id": 11,
        "user_id": 2,
        "action": "USER_LOGIN",
        "table_name": "users",
        "record_id": 2,
        "old_value": null,
        "new_value": null,
        "timestamp": "2025-12-23T13:00:05.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 8,
        "user_id": 3,
        "action": "USER_LOGIN",
        "table_name": "users",
        "record_id": 3,
        "old_value": null,
        "new_value": null,
        "timestamp": "2025-12-23T10:30:12.000Z",
        "ip_address": "192.168.1.102",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "user_email": "registrar@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Juan Dela Cruz"
      },
      {
        "log_id": 3,
        "user_id": null,
        "action": "FAILED_LOGIN_ATTEMPT",
        "table_name": "users",
        "record_id": null,
        "old_value": null,
        "new_value": {
          "email": "wrong@email.com",
          "reason": "Invalid password"
        },
        "timestamp": "2025-12-23T08:15:30.000Z",
        "ip_address": "192.168.1.200",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": null,
        "account_type": null,
        "user_name": "Unknown User"
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}

// ============================================================
// SAMPLE 3: Filtered by Date Range
// GET http://localhost:3001/api/activity-logs?startDate=2025-12-23&endDate=2025-12-23&limit=20
// ============================================================
{
  "status": "success",
  "data": {
    "logs": [
      {
        "log_id": 20,
        "user_id": 2,
        "action": "CREATE_DOCUMENT_TYPE",
        "table_name": "document_types",
        "record_id": 8,
        "old_value": null,
        "new_value": {
          "document_name": "Certificate of Registration",
          "base_price": 150,
          "estimated_processing_days": 3,
          "is_active": 1
        },
        "timestamp": "2025-12-23T16:20:45.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 19,
        "user_id": 2,
        "action": "BATCH_APPROVE_REQUESTS",
        "table_name": "document_requests",
        "record_id": null,
        "old_value": null,
        "new_value": {
          "requestIds": [45, 46, 47, 48],
          "status": "approved",
          "count": 4
        },
        "timestamp": "2025-12-23T15:45:20.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 18,
        "user_id": 3,
        "action": "REJECT_DOCUMENT_REQUEST",
        "table_name": "document_requests",
        "record_id": 50,
        "old_value": {
          "request_status": "pending_verification"
        },
        "new_value": {
          "request_status": "rejected",
          "rejection_reason": "Incomplete requirements"
        },
        "timestamp": "2025-12-23T15:10:30.000Z",
        "ip_address": "192.168.1.102",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "user_email": "registrar@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Juan Dela Cruz"
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}

// ============================================================
// SAMPLE 4: Filtered by Table Name
// GET http://localhost:3001/api/activity-logs?tableName=document_requests&page=1&limit=5
// ============================================================
{
  "status": "success",
  "data": {
    "logs": [
      {
        "log_id": 15,
        "user_id": 2,
        "action": "APPROVE_DOCUMENT_REQUEST",
        "table_name": "document_requests",
        "record_id": 45,
        "old_value": {
          "request_status": "pending_verification"
        },
        "new_value": {
          "request_status": "processing",
          "admin_id": 2
        },
        "timestamp": "2025-12-23T14:30:25.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 19,
        "user_id": 2,
        "action": "BATCH_APPROVE_REQUESTS",
        "table_name": "document_requests",
        "record_id": null,
        "old_value": null,
        "new_value": {
          "requestIds": [45, 46, 47, 48],
          "status": "approved",
          "count": 4
        },
        "timestamp": "2025-12-23T15:45:20.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 5,
      "totalPages": 1
    }
  }
}

// ============================================================
// SAMPLE 5: Search Query
// GET http://localhost:3001/api/activity-logs?search=192.168.1.105&limit=10
// ============================================================
{
  "status": "success",
  "data": {
    "logs": [
      {
        "log_id": 20,
        "user_id": 2,
        "action": "CREATE_DOCUMENT_TYPE",
        "table_name": "document_types",
        "record_id": 8,
        "old_value": null,
        "new_value": {
          "document_name": "Certificate of Registration",
          "base_price": 150,
          "estimated_processing_days": 3,
          "is_active": 1
        },
        "timestamp": "2025-12-23T16:20:45.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 15,
        "user_id": 2,
        "action": "APPROVE_DOCUMENT_REQUEST",
        "table_name": "document_requests",
        "record_id": 45,
        "old_value": {
          "request_status": "pending_verification"
        },
        "new_value": {
          "request_status": "processing",
          "admin_id": 2
        },
        "timestamp": "2025-12-23T14:30:25.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}

// ============================================================
// SAMPLE 6: Empty Results
// GET http://localhost:3001/api/activity-logs?action=NONEXISTENT_ACTION
// ============================================================
{
  "status": "success",
  "data": {
    "logs": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 50,
      "totalPages": 0
    }
  }
}

// ============================================================
// SAMPLE 7: Pagination Example (Page 2)
// GET http://localhost:3001/api/activity-logs?page=2&limit=3
// ============================================================
{
  "status": "success",
  "data": {
    "logs": [
      {
        "log_id": 12,
        "user_id": 2,
        "action": "VERIFY_PAYMENT",
        "table_name": "payments",
        "record_id": 78,
        "old_value": {
          "payment_status": "submitted",
          "verified_by": null
        },
        "new_value": {
          "payment_status": "verified",
          "verified_by": 2,
          "verified_at": "2025-12-23T13:30:00.000Z"
        },
        "timestamp": "2025-12-23T13:30:15.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 11,
        "user_id": 2,
        "action": "USER_LOGIN",
        "table_name": "users",
        "record_id": 2,
        "old_value": null,
        "new_value": null,
        "timestamp": "2025-12-23T13:00:05.000Z",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "user_email": "admin@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Maria Santos"
      },
      {
        "log_id": 10,
        "user_id": 3,
        "action": "UPDATE_SYSTEM_SETTINGS",
        "table_name": "system_settings",
        "record_id": 5,
        "old_value": {
          "setting_key": "max_file_size",
          "setting_value": "5242880"
        },
        "new_value": {
          "setting_key": "max_file_size",
          "setting_value": "10485760"
        },
        "timestamp": "2025-12-23T11:45:20.000Z",
        "ip_address": "192.168.1.102",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "user_email": "registrar@eregistrar.edu",
        "account_type": "admin",
        "user_name": "Juan Dela Cruz"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 2,
      "limit": 3,
      "totalPages": 5
    }
  }
}

// ============================================================
// SAMPLE 8: Error Response
// (e.g., Database connection issue)
// ============================================================
{
  "status": "error",
  "message": "Failed to fetch activity logs"
}
