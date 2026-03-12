--------------------------------------------------
##Get all Payment Method
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
    Default
     http://localhost:3001/api/payment-methods
     
    display only the active payment method
     http://localhost:3001/api/payment-methods?is_active=1

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": [
        {
            "method_id": 1,
            "method_name": "GCash",
            "send_to": "09171234567",
            "sender_name": "Registrar Office",
            "is_active": true,
            "created_at": "2025-12-26T07:23:01.000Z"
        },
        {
            "method_id": 2,
            "method_name": "Bank Transfer",
            "send_to": "BDO - 123456789",
            "sender_name": "Registrar Office",
            "is_active": true,
            "created_at": "2025-12-26T07:23:01.000Z"
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
