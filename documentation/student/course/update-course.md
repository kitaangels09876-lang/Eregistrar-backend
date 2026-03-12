--------------------------------------------------
##Update Course
--------------------------------------------------

#Prerequisites
    -Method
        PUT 
    -EndPoint
    Default
     http://localhost:3001/api/courses/:courseId

--------------------------------------------------
Body:raw json
--------------------------------------------------
{
  "course_code": "BSIT",
  "course_name": "Bachelor of Science in Information Technology",
  "course_description": "IT-focused computing program",
  "department": "College of Computing"
}

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
  "status": "success",
  "message": "Course updated successfully"
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}