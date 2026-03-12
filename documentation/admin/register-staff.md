--------------------------------------------------
## Register staff
--------------------------------------------------

#Prerequisites
    -Method
        POST
    -EndPoint
      http://localhost:3001/api/auth/register-staff

--------------------------------------------------
field    (raw)
--------------------------------------------------
{
  "email": "quivir@gmail.com",
  "password": "Password123!",
  "role": "admin",
  "first_name": "Juan",
  "middle_name": "D",
  "last_name": "Cruz",
  "contact_number": "09123456789"
}

--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "admin account created successfully",
    "user": {
        "user_id": 4,
        "email": "quivir@gmail.com",
        "role": "admin"
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


