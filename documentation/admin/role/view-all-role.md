--------------------------------------------------
## View All Role
--------------------------------------------------

# Prerequisites
    - Method
        GET
    - Endpoint
    default
        http://localhost:3001/api/roles
        
--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": [
        {
            "role_id": 1,
            "role_name": "admin",
            "role_description": "Full system administrator with all privileges"
        },
        {
            "role_id": 3,
            "role_name": "registrar",
            "role_description": "Registrar staff who manages course registrations and records"
        },
        {
            "role_id": 2,
            "role_name": "student",
            "role_description": "Registered student user with limited access"
        }
    ]
}   
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
