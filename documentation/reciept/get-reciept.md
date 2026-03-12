--------------------------------------------------
##get-reciept.md
--------------------------------------------------
*ibutand ni sa every batch card, put a button that treger this endpoint to generate reciept for that batch.
#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/receipts/:receipt_id/reprint

role:admin, registrar, student

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Receipt reprinted successfully",
    "data": {
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
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}