--------------------------------------------------
## View All admin and Registrar
--------------------------------------------------

# Prerequisites
    - Method
        GET
    - Endpoint
    default
        http://localhost:3001/api/admins
    pagination
        http://localhost:3001/api/admins?page=1&limit=10
    Search Students
        http://localhost:3001/api/admins?search=santos
    Search + Pagination
        http://localhost:3001/api/admins?page=2&limit=5&search=registrar
        
--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "pagination": {
        "total": 3,
        "page": 1,
        "limit": 10,
        "totalPages": 1
    },
    "data": [
        {
            "user_id": 4,
            "email": "quivir@gmail.com",
            "account_type": "admin",
            "status": "active",
            "created_at": "2025-12-28T12:25:55.000Z",
            "admin_id": 3,
            "first_name": "Juan",
            "middle_name": "D",
            "last_name": "Cruz",
            "contact_number": "09123456789",
            "roles": "admin"
        },
        {
            "user_id": 1,
            "email": "admin@example.com",
            "account_type": "admin",
            "status": "active",
            "created_at": "2025-12-28T09:26:21.000Z",
            "admin_id": 1,
            "first_name": "System",
            "middle_name": null,
            "last_name": "Administrator",
            "contact_number": "09171234567",
            "roles": "admin"
        },
        {
            "user_id": 2,
            "email": "registrar@eregistrar.com",
            "account_type": "admin",
            "status": "active",
            "created_at": "2025-12-28T09:26:21.000Z",
            "admin_id": 2,
            "first_name": "Jane",
            "middle_name": null,
            "last_name": "Registrar",
            "contact_number": "09179876543",
            "roles": "registrar"
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
