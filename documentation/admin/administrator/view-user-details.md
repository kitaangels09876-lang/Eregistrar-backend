--------------------------------------------------
## View admin and registrar Details
--------------------------------------------------

# Prerequisites
    - Method
        GET
    - Endpoint
        http://localhost:3001/api/admins/:user_id
        
--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "user_id": 1,
        "email": "admin@example.com",
        "account_type": "admin",
        "status": "active",
        "created_at": "2025-12-28T09:26:21.000Z",
        "updated_at": null,
        "admin_id": 1,
        "first_name": "System",
        "middle_name": null,
        "last_name": "Administrator",
        "contact_number": "09171234567",
        "admin_created_at": "2025-12-28T09:26:21.000Z",
        "admin_updated_at": null,
        "roles": "admin"
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
