--------------------------------------------------
##Get  Payment Method By Id
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
    Default
     http://localhost:3001/api/payment-methods/:method_id
    

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "method_id": 1,
        "method_name": "GCash",
        "send_to": "09171234567",
        "sender_name": "University Cashier",
        "is_active": true,
        "created_at": "2025-12-29T13:35:49.000Z"
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
