--------------------------------------------------
## Register student
--------------------------------------------------

#Prerequisites
    -Method
        POST
    -EndPoint
      http://localhost:3001/api/auth/register-student

--------------------------------------------------
body:(raw)
--------------------------------------------------
{
  "email": "student21@sample.com",
  "password": "password123",

  "student_number": "2025-00011",

  "first_name": "Juan",
  "middle_name": "Santos",
  "last_name": "Dela Cruz",
  "extension_name": null,

  "birthdate": "2002-05-10",
  "gender": "male",
  "contact_number": "09171234567",

  "course_id": 1,
  "year_level": "1st"
}


--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Student account created successfully",
    "user": {
        "user_id": 5,
        "email": "student21@sample.com",
        "account_type": "student"
    },
    "student": {
        "student_id": 3,
        "student_number": "2025-00011",
        "first_name": "Juan",
        "last_name": "Dela Cruz"
    }
}

--------------------------------------------------
Error Response  
--------------------------------------------------
{
    "status": "error",
    "message": "Validation failed",
    "errors": [
        {
            "field": "email",
            "message": "Invalid email format"
        }
    ]
}


