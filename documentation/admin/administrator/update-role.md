--------------------------------------------------
## Update Role
--------------------------------------------------

# Prerequisites
    - Method
        PUT
    - Endpoint
        http://localhost:3001/api/admins/:user_id/role
        
--------------------------------------------------
Body:raw
--------------------------------------------------
{
  "role": "registrar"
}

--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "User role successfully changed to registrar"
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
