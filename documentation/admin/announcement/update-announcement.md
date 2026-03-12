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
  "message": "updated"
}

Optional fields:
  "start_date": "2025-11-01"
  "end_date": "2025-11-05"
  "start_date": null
  "end_date": null

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
