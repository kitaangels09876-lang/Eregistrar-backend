--------------------------------------------------
##Update payment method
--------------------------------------------------

#Prerequisites
    -Method
        PUT 
    -EndPoint
     http://localhost:3001/api/payment-methods/1

--------------------------------------------------
Body:raw
--------------------------------------------------
{
  "method_name": "GCash",
  "send_to": "123456789",
  "sender_name": "Quivir",
  "is_active": true
}
--------------------------------------------------
Response    (200 success)
--------------------------------------------------
{
    "status": "success",
    "message": "Payment method updated successfully",
    "data": {
        "method_id": 1,
        "method_name": "GCash",
        "send_to": "123456789",
        "sender_name": "Quivir",
        "is_active": true,
        "created_at": "2025-12-26T07:23:01.000Z"
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}