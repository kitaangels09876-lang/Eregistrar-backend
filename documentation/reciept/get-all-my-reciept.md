--------------------------------------------------
##get-all-my-reciept.md
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/receipts/my

role:student

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Receipts retrieved successfully",
    "meta": {
        "page": 1,
        "limit": 10,
        "total": 4,
        "totalPages": 1
    },
    "data": [
        {
            "receipt": {
                "receipt_id": 1,
                "receipt_reference": "REC-1-20250210-A1B2",
                "batch_id": 1,
                "issued_at": "2026-02-11 10:54:49",
                "total_paid": "350.00",
                "completed_amount": "300.00",
                "rejected_amount": "50.00",
                "refundable_amount": "50.00",
                "currency": "PHP",
                "receipt_status": "issued",
                "pdf_path": "/uploads/receipts/receipt-REC-1-20250210-A1B2.pdf"
            },
            "school": {
                "school_name": "Trinidad Municipal College",
                "school_short_name": "TMC",
                "school_email": "registrar@tmc.edu.ph",
                "school_contact_number": "+63 917 123 4567",
                "school_address": "Poblacion, Trinidad, Bohol",
                "school_website": "https://tmc.edu.ph"
            },
            "student": {
                "student_id": 1,
                "student_number": "2024-0001",
                "full_name": "Dela Cruz, Juan",
                "course_name": "Bachelor of Science in Information Technology"
            },
            "items": [
                {
                    "document_name": "Transcript of Records",
                    "quantity": 2,
                    "amount": 300,
                    "request_status": "completed"
                },
                {
                    "document_name": "Certificate of Enrollment",
                    "quantity": 1,
                    "amount": 50,
                    "request_status": "rejected"
                }
            ]
        },
        {
            "receipt": {
                "receipt_id": 5,
                "receipt_reference": "OR-1770724234361-4",
                "batch_id": 4,
                "issued_at": "2026-02-11 03:50:34",
                "total_paid": "150.00",
                "completed_amount": "150.00",
                "rejected_amount": "0.00",
                "refundable_amount": "0.00",
                "currency": "PHP",
                "receipt_status": "issued",
                "pdf_path": "/uploads/receipts/receipt-OR-1770724234361-4.pdf"
            },
            "school": {
                "school_name": "Trinidad Municipal College",
                "school_short_name": "TMC",
                "school_email": "registrar@tmc.edu.ph",
                "school_contact_number": "+63 917 123 4567",
                "school_address": "Poblacion, Trinidad, Bohol",
                "school_website": "https://tmc.edu.ph"
            },
            "student": {
                "student_id": 1,
                "student_number": "2024-0001",
                "full_name": "Dela Cruz, Juan",
                "course_name": "Bachelor of Science in Information Technology"
            },
            "items": [
                {
                    "document_name": "Transcript of Records",
                    "quantity": 1,
                    "amount": 150,
                    "request_status": "completed"
                }
            ]
        },
        {
            "receipt": {
                "receipt_id": 4,
                "receipt_reference": "OR-1770723602319-3",
                "batch_id": 3,
                "issued_at": "2026-02-11 03:40:02",
                "total_paid": "150.00",
                "completed_amount": "150.00",
                "rejected_amount": "0.00",
                "refundable_amount": "0.00",
                "currency": "PHP",
                "receipt_status": "issued",
                "pdf_path": "/uploads/receipts/receipt-OR-1770723602319-3.pdf"
            },
            "school": {
                "school_name": "Trinidad Municipal College",
                "school_short_name": "TMC",
                "school_email": "registrar@tmc.edu.ph",
                "school_contact_number": "+63 917 123 4567",
                "school_address": "Poblacion, Trinidad, Bohol",
                "school_website": "https://tmc.edu.ph"
            },
            "student": {
                "student_id": 1,
                "student_number": "2024-0001",
                "full_name": "Dela Cruz, Juan",
                "course_name": "Bachelor of Science in Information Technology"
            },
            "items": [
                {
                    "document_name": "Transcript of Records",
                    "quantity": 1,
                    "amount": 150,
                    "request_status": "completed"
                }
            ]
        },
        {
            "receipt": {
                "receipt_id": 2,
                "receipt_reference": "RCPT-1770722462597-2",
                "batch_id": 2,
                "issued_at": "2026-02-11 03:21:02",
                "total_paid": "350.00",
                "completed_amount": "350.00",
                "rejected_amount": "0.00",
                "refundable_amount": "0.00",
                "currency": "PHP",
                "receipt_status": "issued",
                "pdf_path": "/uploads/receipts/receipt-RCPT-1770722462597-2.pdf"
            },
            "school": {
                "school_name": "Trinidad Municipal College",
                "school_short_name": "TMC",
                "school_email": "registrar@tmc.edu.ph",
                "school_contact_number": "+63 917 123 4567",
                "school_address": "Poblacion, Trinidad, Bohol",
                "school_website": "https://tmc.edu.ph"
            },
            "student": {
                "student_id": 1,
                "student_number": "2024-0001",
                "full_name": "Dela Cruz, Juan",
                "course_name": "Bachelor of Science in Information Technology"
            },
            "items": [
                {
                    "document_name": "Certificate of Enrollment",
                    "quantity": 1,
                    "amount": 50,
                    "request_status": "completed"
                },
                {
                    "document_name": "Transcript of Records",
                    "quantity": 2,
                    "amount": 300,
                    "request_status": "completed"
                }
            ]
        }
    ]
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}