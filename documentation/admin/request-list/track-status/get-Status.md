--------------------------------------------------
##Get Status
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/requests/:requestId/status-logs
============================================================
  200 ok
============================================================
{
    "status": "success",
    "data": [
        {
            "status": "pending",
            "messages": [
                {
                    "status_log_id": 1,
                    "message": "Request submitted",
                    "created_at": "2025-12-26T07:23:01.000Z",
                    "updated_at": null,
                    "admin_name": "Regina Registrar",
                    "admin_id": 2
                },
                {
                    "status_log_id": 6,
                    "message": "Waiting for registrar approval",
                    "created_at": "2025-12-26T08:09:05.000Z",
                    "updated_at": null,
                    "admin_name": "System Administrator",
                    "admin_id": 1
                }
            ]
        },
        {
            "status": "processing",
            "messages": [
                {
                    "status_log_id": 2,
                    "message": "Processing documents",
                    "created_at": "2025-12-26T07:23:01.000Z",
                    "updated_at": null,
                    "admin_name": "Regina Registrar",
                    "admin_id": 2
                },
                {
                    "status_log_id": 4,
                    "message": "Waiting for registrar approval",
                    "created_at": "2025-12-26T08:08:17.000Z",
                    "updated_at": null,
                    "admin_name": "System Administrator",
                    "admin_id": 1
                },
                {
                    "status_log_id": 5,
                    "message": "Waiting for registrar approval",
                    "created_at": "2025-12-26T08:08:32.000Z",
                    "updated_at": null,
                    "admin_name": "System Administrator",
                    "admin_id": 1
                }
            ]
        },
        {
            "status": "releasing",
            "messages": [
                {
                    "status_log_id": 7,
                    "message": "Documents are now under processing",
                    "created_at": "2025-12-26T08:10:38.000Z",
                    "updated_at": null,
                    "admin_name": "System Administrator",
                    "admin_id": 1
                }
            ]
        },
        {
            "status": "completed",
            "messages": [
                {
                    "status_log_id": 8,
                    "message": "Documents are now under completed",
                    "created_at": "2025-12-26T08:11:33.000Z",
                    "updated_at": null,
                    "admin_name": "System Administrator",
                    "admin_id": 1
                }
            ]
        }
    ]
}