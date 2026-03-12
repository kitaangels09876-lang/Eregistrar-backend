--------------------------------------------------
## View Students Details
--------------------------------------------------

# Prerequisites
    - Method
        GET
    - Endpoint
        http://localhost:3001/api/students/:student_id
        
--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "student": {
            "student_id": 1,
            "student_number": "2024-0001",
            "full_name": "Juan  Dela Cruz",
            "first_name": "Juan",
            "middle_name": null,
            "last_name": "Dela Cruz",
            "extension_name": null,
            "birthdate": null,
            "gender": "male",
            "contact_number": "09991234567",
            "profile_picture": null,
            "year_level": "1st",
            "enrollment_status": "enrolled",
            "user_id": 3,
            "email": "student1@eregistrar.com",
            "account_status": "active",
            "account_created_at": "2025-12-28T09:26:21.000Z",
            "course_id": 1,
            "course_code": "BSIT",
            "course_name": "Bachelor of Science in Information Technology",
            "department": "College of Computing",
            "roles": "student"
        },
        "addresses": [
            {
                "address_type": "current",
                "province_name": "Laguna",
                "municipality_name": "Calamba City",
                "barangay_name": "Barangay Uno",
                "street": "123 Rizal Street",
                "postal_code": null
            }
        ],
        "guardians": [
            {
                "guardian_type": "father",
                "first_name": "Pedro",
                "last_name": "Dela Cruz",
                "contact_number": "09170000000",
                "occupation": null,
                "email": null
            }
        ]
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
