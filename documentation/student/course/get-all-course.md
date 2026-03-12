--------------------------------------------------
##Get all Course
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
    Default
     http://localhost:3001/api/courses

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": [
        {
            "course_id": 2,
            "course_code": "BSBA",
            "course_name": "Bachelor of Science in Business Administration",
            "course_description": null,
            "department": "College of Business",
            "created_at": "2025-12-29T13:35:48.000Z"
        },
        {
            "course_id": 1,
            "course_code": "BSIT",
            "course_name": "Bachelor of Science in Information Technology",
            "course_description": null,
            "department": "College of Computing",
            "created_at": "2025-12-29T13:35:48.000Z"
        }
    ]
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}