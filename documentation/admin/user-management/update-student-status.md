--------------------------------------------------
## Update student status
--------------------------------------------------

# Prerequisites
    - Method
        PATCH
    - Endpoint
        http://localhost:3001/api/students/:student_id/status
        
--------------------------------------------------
Body:raw
--------------------------------------------------
{
  "status": "active"
}

--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Student account status updated successfully",
    "data": {
        "student_id": 1,
        "new_status": "active"
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
