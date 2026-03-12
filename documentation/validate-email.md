--------------------------------------------------
## Validate Email
--------------------------------------------------

#Prerequisites
    -Method
        POST
    -EndPoint
      http://localhost:3001/api/validate-email

--------------------------------------------------
body:(raw)
--------------------------------------------------
{
  "email": "admin@example.com"
}



--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Email already exists and is active",
    "data": {
        "exists": true,
        "active": true
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


