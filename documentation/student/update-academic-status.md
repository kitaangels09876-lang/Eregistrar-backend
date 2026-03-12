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
  "year_level": "First Year",
  "enrollment_status": "alumni"
}

Note:
- `year_level` accepts any text value
- `enrollment_status` is still validated by the backend


--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Student academic status updated successfully"
}

