--------------------------------------------------
## Verify student email
--------------------------------------------------

# Prerequisites
    - Method
        GET
    - Endpoint
        http://localhost:3001/api/auth/verify-email?token=YOUR_VERIFICATION_TOKEN
    - Authentication
        Public

--------------------------------------------------
How it works
--------------------------------------------------
- This endpoint is opened from the verification email sent after student registration
- It activates the student account automatically if the token is valid
- The response is an HTML page intended to be opened in a browser

--------------------------------------------------
Success result
--------------------------------------------------
- The page shows `Email confirmed`
- The related user account status is updated from `inactive` to `active`

--------------------------------------------------
Possible failure cases
--------------------------------------------------
- Missing token
- Invalid token
- Expired token
- Account not found
