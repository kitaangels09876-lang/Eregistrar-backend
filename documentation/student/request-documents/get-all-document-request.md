--------------------------------------------------
##Get all Document Request
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/student/document-requests/batches

Query Params:
?page=1
&limit=5
&search=certificate
&payment_status=pending
&batch_status=pending
&request_status=processing

--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "pagination": {
            "page": 1,
            "limit": 5,
            "total_batches": 1,
            "total_pages": 1
        },
        "batches": [
            {
                "batch_id": 1,
                "total_amount": "350.00",
                "created_at": "2026-01-20T12:00:46.000Z",
                "payment": {
                    "batch_status": "pending",
                    "payment_status": "pending",
                    "display_status": "Not paid yet"
                },
                "requests": [
                    {
                        "request_id": 1,
                        "document_type_id": 1,
                        "document_name": "Transcript of Records",
                        "purpose": "Employment",
                        "quantity": 2,
                        "total_amount": "300.00",
                        "delivery_method": "pickup",
                        "request_status": "pending",
                        "created_at": "2026-01-20T12:00:46.000Z"
                    },
                    {
                        "request_id": 2,
                        "document_type_id": 2,
                        "document_name": "Certificate of Enrollment",
                        "purpose": "Scholarship",
                        "quantity": 1,
                        "total_amount": "50.00",
                        "delivery_method": "pickup",
                        "request_status": "pending",
                        "created_at": "2026-01-20T12:00:46.000Z"
                    }
                ]
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