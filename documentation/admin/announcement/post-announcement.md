--------------------------------------------------
##Post Announcement
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/announcements

--------------------------------------------------
Body:Raw
--------------------------------------------------
{
  "title": "TMC | Holiday Non Working Days",
  "start_date": "2025-11-01",
  "end_date": "2025-11-05",
  "message": "Kindly plan your schedules and pending tasks accordingly. All operations and office activities will resume on the next regular working day following the holiday.\n\nWe wish everyone a safe and joyful holiday season!"
}

--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Announcement posted successfully"
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}