--------------------------------------------------
## Resend verification email
--------------------------------------------------

# Prerequisites
    - Method
        POST
    - Endpoint
        http://localhost:3001/api/auth/resend-verification-email
    - Authentication
        Public
    - Content-Type
        application/json

--------------------------------------------------
Body (raw JSON)
--------------------------------------------------
{
  "email": "student21@sample.com"
}

--------------------------------------------------
Response (200 OK)
--------------------------------------------------
{
  "status": "success",
  "message": "Verification email sent successfully"
}

--------------------------------------------------
Error Response 400
--------------------------------------------------
{
  "status": "error",
  "message": "This account is already active"
}

--------------------------------------------------
Error Response 404
--------------------------------------------------
{
  "status": "error",
  "message": "Student account not found"
}
