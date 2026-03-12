--------------------------------------------------
##Payment List
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
    Default
        http://localhost:3001/api/payments
    Filter by payment status ('pending','submitted','verified','rejected','refunded')
        http://localhost:3001/api/payments?payment_status=verified
    Filter by request status('pending','processing','releasing','completed')
        http://localhost:3001/api/payments?request_status=completed
    Search
        http://localhost:3001/api/payments?search=juan
    Combined
        http://localhost:3001/api/payments?payment_status=submitted&request_status=processing&search=juan&page=1&limit=10

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "pagination": {
        "totalRecords": 1,
        "totalPages": 1,
        "currentPage": 1,
        "limit": 10
    },
    "data": [
        {
            "payment_id": 1,
            "student_id": 1,
            "student_name": "Juan  Dela Cruz",
            "amount": "350.00",
            "method_name": "GCash",
            "payment_status": "pending",
            "payment_proof": "NO RECEIPT",
            "total_amount": "300.00",
            "request_status": "processing",
            "requested_documents": "Certificate of Enrollment, Transcript of Records",
            "created_at": "2026-01-21T07:33:02.000Z"
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