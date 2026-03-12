--------------------------------------------------
##Get all Document
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
    Default
     http://localhost:3001/api/documents
    pagination
     http://localhost:3001/api/documents?page=1&limit=5
    Search
     http://localhost:3001/api/documents?search=certificate
    Active only
     http://localhost:3001/api/documents?is_active=1
--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "pagination": {
        "totalRecords": 3,
        "totalPages": 1,
        "currentPage": 1,
        "limit": 10
    },
    "data": [
        {
            "document_type_id": 1,
            "document_name": "Transcript of Records",
            "description": "Official academic transcript",
            "base_price": "150.00",
            "requirements": "Valid ID",
            "estimated_processing_days": 5,
            "is_active": true,
            "created_at": "2025-12-26T07:23:01.000Z",
            "updated_at": "2025-12-26T07:23:01.000Z"
        },
        {
            "document_type_id": 2,
            "document_name": "Certificate of Enrollment",
            "description": "Proof of enrollment",
            "base_price": "50.00",
            "requirements": "Student ID",
            "estimated_processing_days": 2,
            "is_active": true,
            "created_at": "2025-12-26T07:23:01.000Z",
            "updated_at": "2025-12-26T07:23:01.000Z"
        },
        {
            "document_type_id": 3,
            "document_name": "Good Moral Certificate",
            "description": "Issued by registrar",
            "base_price": "100.00",
            "requirements": "Clearance",
            "estimated_processing_days": 3,
            "is_active": true,
            "created_at": "2025-12-26T07:23:01.000Z",
            "updated_at": "2025-12-26T07:23:01.000Z"
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