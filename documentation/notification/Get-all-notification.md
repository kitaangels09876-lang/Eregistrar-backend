--------------------------------------------------
##Get all Notification
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/my-notifications


--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": [
        {
            "notification_id": 1,
            "title": "Payment Pending",
            "message": "Please upload payment proof to proceed.",
            "type": "payment_update",
            "is_read": false,
            "created_at": "2026-01-21T07:33:02.000Z"
        }
    ],
    "meta": {
        "page": 1,
        "limit": 10,
        "total": 1,
        "totalPages": 1,
        "unread_count": 1
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}