--------------------------------------------------
##Get Payment By Id
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/payments/:payment_id

--------------------------------------------------
Response    (200 success)
--------------------------------------------------
{
  "status": "success",
  "data": {
    "payment_id": 12,
    "student_id": 5,
    "student_name": "Juan D Cruz",
    "payment_status": "submitted",
    "order_status": "processing",
    "total_fee": "350.00",
    "requested_documents": "Transcript of Records",
    "receipt": "uploads/payments/2025/01/payment_12_gcash.png",
    "created_at": "2025-01-28T10:12:33.000Z"
  }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}



example:
--------------------------------------------------
Copy the value:
uploads/payments/2025/01/payment_12_gcash.png

Then open in browser:
http://localhost:5000/uploads/payments/2025/01/payment_12_gcash.png