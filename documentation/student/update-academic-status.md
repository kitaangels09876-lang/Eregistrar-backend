--------------------------------------------------
## update-academic-status.md
--------------------------------------------------

#Prerequisites
    -Method
        PATCH
    -EndPoint
      http://localhost:3001/api/students/:student_id/academic-status

--------------------------------------------------
body:(raw)
--------------------------------------------------
{
  "year_level": "graduate",
  "enrollment_status": "alumni"
}


--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Student academic status updated successfully"
}


