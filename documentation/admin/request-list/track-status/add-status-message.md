--------------------------------------------------
##Add Status Message
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/requests/:requestId/status-messages
============================================================
  raw
============================================================
{
  "status": "pending",
  "message": "Waiting for registrar approval"
}

============================================================
  201 created
============================================================
{
    "status": "success",
    "message": "Message added successfully",
    "data": {
        "status_log_id": 6,
        "status": "pending",
        "message": "Waiting for registrar approval",
        "created_at": "2025-12-26T08:09:05.000Z",
        "updated_at": null,
        "admin_name": "System Administrator",
        "admin_id": 1
    }
}