--------------------------------------------------
##dashboard
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
    Default
     http://localhost:3001/api/dashboard/student

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "documents": {
            "total": 4,
            "pending": 4,
            "processing": 0,
            "releasing": 0,
            "completed": 0
        },
        "payments": {
            "total": 2,
            "pending": 1,
            "submitted": 0,
            "verified": 1,
            "outstanding_balance": 350
        },
        "notifications": {
            "unread": 1
        }
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}