--------------------------------------------------
#Update Announcement
--------------------------------------------------

#Prerequisites
    -Method
        PUT 
    -EndPoint
     http://localhost:3001/api/announcements/:announcement_id

--------------------------------------------------
Body:raw
--------------------------------------------------
{
  "title": "TMC | Holiday Non Working Days",
  "start_date": "2025-11-01",
  "end_date": "2025-11-05",
  "message": "updated"
}

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