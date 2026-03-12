--------------------------------------------------
##mark-as-read.md
--------------------------------------------------

#Prerequisites
    -Method
        PATCH 
    -EndPoint
     http://localhost:3001/api/my-notifications/:notification_id/read


--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Notification marked as read",
    "data": {
        "notification_id": 1,
        "is_read": true
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}