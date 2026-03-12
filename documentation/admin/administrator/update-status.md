--------------------------------------------------
## Update Status
--------------------------------------------------

# Prerequisites
    - Method
        PUT
    - Endpoint
        http://localhost:3001/api/admins/:user_id/status
        
--------------------------------------------------
Body:raw
--------------------------------------------------
{
  "status": "active"
}
--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "User status successfully changed to inactive"
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
