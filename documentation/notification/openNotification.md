--------------------------------------------------
##openNotification.md
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/my-notifications/:notification_id


--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "notification_id": 1,
        "title": "Payment Pending",
        "message": "Please upload payment proof to proceed.",
        "type": "payment_update",
        "is_read": true,
        "created_at": "2026-01-21T07:33:02.000Z",
        "time_ago": "3 hours ago"
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}