--------------------------------------------------
## Login Admin
--------------------------------------------------

#Prerequisites
    -Method
        POST
    -EndPoint
      http://localhost:3001/api/auth/login


--------------------------------------------------
field    (raw)
--------------------------------------------------
{
  "email": "admin@example.com",
  "password": "strongPassword123"
}

--------------------------------------------------
Response    (200 ok)
--------------------------------------------------
{
    "status": "success",
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZXMiOlsiYWRtaW4iXSwiYWNjb3VudF90eXBlIjoiYWRtaW4iLCJpYXQiOjE3NjU0OTgzOTAsImV4cCI6MTc2NTUwMTk5MH0.EDAUAdj1victN1nQGjoDZq6zdJnZHnZXhj9OpICsS_0",
    "expires_in": "1h",
    "user": {
        "user_id": 1,
        "email": "admin@example.com",
        "account_type": "admin",
        "roles": [
            "admin"
        ],
        "status": "active",
        "created_at": "2025-12-11T13:59:07.000Z"
    },
    "profile": {
        "admin_id": 1,
        "user_id": 1,
        "first_name": "John",
        "middle_name": "Doe",
        "last_name": "Smith",
        "contact_number": "12345678990",
        "created_at": "2025-12-11T13:59:07.000Z",
        "updated_at": "2025-12-11T13:59:07.000Z"
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
    "message": "Validation failed",
    "errors": [
        {
            "field": "password",
            "message": "Password is required"
        }
    ]
}
