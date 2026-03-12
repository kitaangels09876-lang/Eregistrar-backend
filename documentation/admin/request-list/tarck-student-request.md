--------------------------------------------------
tarck-student-request.md
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/student-requests/:request_id/tracking

============================================================
{
    "status": "success",
    "request": {
        "request_id": 2,
        "student_id": 1,
        "purpose": "Scholarship",
        "delivery_method": "pickup",
        "quantity": 1,
        "total_amount": "50.00",
        "request_status": "pending",
        "created_at": "2026-01-19T03:13:14.000Z",
        "document_name": "Certificate of Enrollment",
        "estimated_processing_days": 2,
        "student_number": "2024-0001",
        "student_name": "Juan Dela Cruz"
    },
    "tracking": [
        {
            "status": "pending",
            "message": "Request submitted",
            "created_at": "2026-01-19T03:13:14.000Z",
            "updated_by": "Jane Registrar"
        }
    ]
}
============================================================
{
  "status": "error",
  "message": "Request not found"
}
