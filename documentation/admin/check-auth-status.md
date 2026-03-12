--------------------------------------------------
##check-auth-status
--------------------------------------------------
GET: http://localhost:3001/api/auth/me
{
    "status": "success",
    "message": "Login successful",
    "user": {
        "user_id": 1,
        "email": "admin@example.com",
        "account_type": "admin",
        "roles": [
            "admin"
        ],
        "status": "active",
        "created_at": "2025-12-28T14:22:35.000Z"
    },
    "profile": {
        "admin_id": 1,
        "user_id": 1,
        "first_name": "System",
        "middle_name": null,
        "last_name": "Administrator",
        "contact_number": "09171234567",
        "created_at": "2025-12-28T14:22:35.000Z",
        "updated_at": null
    }
}