--------------------------------------------------
## update Account
--------------------------------------------------

#Prerequisites
    -Method
        PUT
    -EndPoint
      http://localhost:3001/api/auth/me

--------------------------------------------------
body:raw  
--------------------------------------------------
{
  "email": "admin@example.com",
  "first_name": "System",
  "middle_name": null,
  "last_name": "Administrator",
  "contact_number": "09170000000"
}



--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Account updated successfully"
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


