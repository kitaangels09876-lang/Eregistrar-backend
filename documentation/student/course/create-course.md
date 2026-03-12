--------------------------------------------------
##Create Course
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/courses

--------------------------------------------------
Body: raw
--------------------------------------------------
{
  "course_code": "BSCS",
  "course_name": "Bachelor of Science in Computer Science",
  "course_description": "Focus on algorithms, software, and systems",
  "department": "College of Computing"
}

--------------------------------------------------
Response    (201 Created)
--------------------------------------------------
{
    "status": "success",
    "message": "Course created successfully",
    "data": {
        "course_id": 3,
        "course_code": "BSCS",
        "course_name": "Bachelor of Science in Computer Science",
        "course_description": "Focus on algorithms, software, and systems",
        "department": "College of Computing"
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}