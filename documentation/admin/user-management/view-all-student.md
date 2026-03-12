--------------------------------------------------
## View All Students
--------------------------------------------------

# Prerequisites
    - Method
        GET
    - Endpoint
    default
        http://localhost:3001/api/students
    pagination
        http://localhost:3001/api/students?page=2&limit=5
    Search Students
        http://localhost:3001/api/students?search=Dela%20Cruz
    Filter by Account Status
        http://localhost:3001/api/students?status=inactive
        
--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "pagination": {
        "totalRecords": 1,
        "totalPages": 1,
        "currentPage": 1,
        "limit": 10
    },
    "data": [
        {
            "student_id": 1,
            "student_number": "2024-0001",
            "full_name": "Juan  Dela Cruz",
            "email": "student1@eregistrar.com",
            "status": "active",
            "enrollment_status": "enrolled",
            "roles": "student",
            "created_at": "2025-12-28T09:26:21.000Z"
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
