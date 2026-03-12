--------------------------------------------------
##Student request by Id
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/student-requests/student/:studentId

============================================================
{
    "status": "success",
    "total": 4,
    "data": [
        {
            "request_id": 4,
            "student_id": 1,
            "purpose": "For employment",
            "delivery_method": "pickup",
            "quantity": 1,
            "total_amount": "50.00",
            "request_status": "pending",
            "created_at": "2026-01-19T03:46:53.000Z",
            "document_name": "Certificate of Enrollment",
            "base_price": "50.00",
            "estimated_processing_days": 2,
            "student_number": "2024-0001",
            "student_name": "Juan Dela Cruz"
        },
        {
            "request_id": 3,
            "student_id": 1,
            "purpose": "For employment",
            "delivery_method": "pickup",
            "quantity": 2,
            "total_amount": "300.00",
            "request_status": "pending",
            "created_at": "2026-01-19T03:46:52.000Z",
            "document_name": "Transcript of Records",
            "base_price": "150.00",
            "estimated_processing_days": 5,
            "student_number": "2024-0001",
            "student_name": "Juan Dela Cruz"
        },
        {
            "request_id": 1,
            "student_id": 1,
            "purpose": "Employment",
            "delivery_method": "pickup",
            "quantity": 2,
            "total_amount": "300.00",
            "request_status": "pending",
            "created_at": "2026-01-19T03:13:14.000Z",
            "document_name": "Transcript of Records",
            "base_price": "150.00",
            "estimated_processing_days": 5,
            "student_number": "2024-0001",
            "student_name": "Juan Dela Cruz"
        },
        {
            "request_id": 2,
            "student_id": 1,
            "purpose": "Scholarship",
            "delivery_method": "pickup",
            "quantity": 1,
            "total_amount": "50.00",
            "request_status": "pending",
            "created_at": "2026-01-19T03:13:14.000Z",
            "document_name": "Certificate of Enrollment",
            "base_price": "50.00",
            "estimated_processing_days": 2,
            "student_number": "2024-0001",
            "student_name": "Juan Dela Cruz"
        }
    ]
}

============================================================
{
  "status": "error",
  "message": "Request not found"
}
