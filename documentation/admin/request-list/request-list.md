--------------------------------------------------
##request list
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/student-requests

============================================================
SAMPLE 1: Get All Student Requests (No Filters)
GET /api/student-requests
============================================================
{
    "status": "success",
    "data": {
        "requests": [
            {
                "request_id": 6,
                "batch_id": 3,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "verified",
                "batch_status": "paid",
                "payment_proof": "/uploads/payments/payment_3_1768911477220.jpeg",
                "dates": {
                    "created_at": "2026-01-20T12:14:18.000Z",
                    "updated_at": "2026-01-20T12:14:18.000Z"
                }
            },
            {
                "request_id": 5,
                "batch_id": 3,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "verified",
                "batch_status": "paid",
                "payment_proof": "/uploads/payments/payment_3_1768911477220.jpeg",
                "dates": {
                    "created_at": "2026-01-20T12:14:18.000Z",
                    "updated_at": "2026-01-20T12:14:18.000Z"
                }
            },
            {
                "request_id": 4,
                "batch_id": 2,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:09:32.000Z",
                    "updated_at": "2026-01-20T12:09:32.000Z"
                }
            },
            {
                "request_id": 3,
                "batch_id": 2,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:09:32.000Z",
                    "updated_at": "2026-01-20T12:09:32.000Z"
                }
            },
            {
                "request_id": 2,
                "batch_id": 1,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "Scholarship",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:00:46.000Z",
                    "updated_at": "2026-01-20T12:00:46.000Z"
                }
            },
            {
                "request_id": 1,
                "batch_id": 1,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "Employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:00:46.000Z",
                    "updated_at": "2026-01-20T12:00:46.000Z"
                }
            }
        ],
        "pagination": {
            "total": 6,
            "page": 1,
            "limit": 20,
            "totalPages": 1
        }
    }
}

============================================================
SAMPLE 2: Filter by Request Status
GET /api/student-requests?status=pending
============================================================
{
    "status": "success",
    "data": {
        "requests": [
            {
                "request_id": 6,
                "batch_id": 3,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "verified",
                "batch_status": "paid",
                "payment_proof": "/uploads/payments/payment_3_1768911477220.jpeg",
                "dates": {
                    "created_at": "2026-01-20T12:14:18.000Z",
                    "updated_at": "2026-01-20T12:14:18.000Z"
                }
            },
            {
                "request_id": 5,
                "batch_id": 3,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "verified",
                "batch_status": "paid",
                "payment_proof": "/uploads/payments/payment_3_1768911477220.jpeg",
                "dates": {
                    "created_at": "2026-01-20T12:14:18.000Z",
                    "updated_at": "2026-01-20T12:14:18.000Z"
                }
            },
            {
                "request_id": 3,
                "batch_id": 2,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:09:32.000Z",
                    "updated_at": "2026-01-20T12:09:32.000Z"
                }
            },
            {
                "request_id": 4,
                "batch_id": 2,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:09:32.000Z",
                    "updated_at": "2026-01-20T12:09:32.000Z"
                }
            },
            {
                "request_id": 1,
                "batch_id": 1,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "Employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:00:46.000Z",
                    "updated_at": "2026-01-20T12:00:46.000Z"
                }
            },
            {
                "request_id": 2,
                "batch_id": 1,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "Scholarship",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:00:46.000Z",
                    "updated_at": "2026-01-20T12:00:46.000Z"
                }
            }
        ],
        "pagination": {
            "total": 6,
            "page": 1,
            "limit": 20,
            "totalPages": 1
        }
    }
}


============================================================
SAMPLE 4: Search Query
GET /api/student-requests?search=Dela%20Cruz
============================================================
{
    "status": "success",
    "data": {
        "requests": [
            {
                "request_id": 6,
                "batch_id": 3,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "verified",
                "batch_status": "paid",
                "payment_proof": "/uploads/payments/payment_3_1768911477220.jpeg",
                "dates": {
                    "created_at": "2026-01-20T12:14:18.000Z",
                    "updated_at": "2026-01-20T12:14:18.000Z"
                }
            },
            {
                "request_id": 5,
                "batch_id": 3,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "verified",
                "batch_status": "paid",
                "payment_proof": "/uploads/payments/payment_3_1768911477220.jpeg",
                "dates": {
                    "created_at": "2026-01-20T12:14:18.000Z",
                    "updated_at": "2026-01-20T12:14:18.000Z"
                }
            },
            {
                "request_id": 3,
                "batch_id": 2,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:09:32.000Z",
                    "updated_at": "2026-01-20T12:09:32.000Z"
                }
            },
            {
                "request_id": 4,
                "batch_id": 2,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "For employment",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:09:32.000Z",
                    "updated_at": "2026-01-20T12:09:32.000Z"
                }
            },
            {
                "request_id": 1,
                "batch_id": 1,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Transcript of Records",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "Employment",
                "quantity": 2,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "300.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:00:46.000Z",
                    "updated_at": "2026-01-20T12:00:46.000Z"
                }
            },
            {
                "request_id": 2,
                "batch_id": 1,
                "student": {
                    "student_id": 1,
                    "student_number": "2024-0001",
                    "full_name": "Juan Dela Cruz",
                    "email": "student1@eregistrar.com"
                },
                "document_requested": "Certificate of Enrollment",
                "all_documents_requested": "Transcript of Records (2), Certificate of Enrollment (1)",
                "purpose": "Scholarship",
                "quantity": 1,
                "delivery_method": "pickup",
                "amount": {
                    "request_total": "50.00",
                    "batch_total": "350.00"
                },
                "status": "pending",
                "payment_status": "pending",
                "batch_status": "pending",
                "payment_proof": null,
                "dates": {
                    "created_at": "2026-01-20T12:00:46.000Z",
                    "updated_at": "2026-01-20T12:00:46.000Z"
                }
            }
        ],
        "pagination": {
            "total": 6,
            "page": 1,
            "limit": 20,
            "totalPages": 1
        }
    }
}


============================================================
SAMPLE 5: Get Request by ID
GET /api/student-requests/1
============================================================

{
    "status": "success",
    "data": {
        "request_id": 1,
        "student_id": 1,
        "document_type_id": 1,
        "purpose": "Employment",
        "delivery_method": "pickup",
        "delivery_address": null,
        "quantity": 2,
        "total_amount": "300.00",
        "request_status": "pending",
        "admin_id": null,
        "rejection_reason": null,
        "created_at": "2026-01-20T12:00:46.000Z",
        "updated_at": "2026-01-20T12:00:46.000Z",
        "student_number": "2024-0001",
        "student_full_name": "Juan Dela Cruz",
        "student_contact": "09991234567",
        "student_email": "student1@eregistrar.com",
        "document_name": "Transcript of Records",
        "base_price": "150.00",
        "requirements": null,
        "estimated_processing_days": 5,
        "payment_status": "Not Paid",
        "payment_amount": null,
        "payment_proof": null,
        "verified_at": null,
        "payment_method": null,
        "admin_name": null
    }
}


============================================================
SAMPLE 6: Request Not Found
GET /api/student-requests/9999
============================================================
{
  "status": "error",
  "message": "Request not found"
}
