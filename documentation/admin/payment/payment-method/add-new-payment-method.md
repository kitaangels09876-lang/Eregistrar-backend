--------------------------------------------------
##Add new Payment method
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/payment-methods

--------------------------------------------------
Body: raw
--------------------------------------------------
{
  "method_name": "GCash",
  "send_to": "0912356789",
  "sender_name": "Registrar Office"
}

--------------------------------------------------
Response    (200 success)
--------------------------------------------------
{
    "status": "success",
    "message": "Payment method created successfully",
    "data": {
        "created_at": "2025-12-28T09:03:24.770Z",
        "method_id": 5,
        "method_name": "GCash",
        "send_to": "0912356789",
        "sender_name": "Registrar Office",
        "is_active": true
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
