--------------------------------------------------
##Pay Document
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/student/payments
--------------------------------------------------
Body:Raw *note:check document request response for batch_id
--------------------------------------------------
{
  "batch_id": 1,
  "method_id": 1
}


--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Payment created. Please upload proof.",
    "data": {
        "payment_id": 5,
        "batch_id": 1,
        "payment_status": "pending",
        "payment_method": {
            "method_id": 1,
            "method_name": "GCash",
            "send_to": "09171234567",
            "sender_name": "University Cashier"
        }
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}