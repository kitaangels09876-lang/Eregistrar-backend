--------------------------------------------------
##Delete Announcement
--------------------------------------------------

#Prerequisites
    -Method
        DELETE 
    -EndPoint
     http://localhost:3001/api/announcements/:announcement_id

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Announcement updated successfully"
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}