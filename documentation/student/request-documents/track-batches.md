--------------------------------------------------
track-batches.md
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/student/document-requests/batches/:batch_id/track


--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "batch_id": 1,
        "requests": [
            {
                "request_id": 1,
                "request_status": "pending",
                "document_name": "Transcript of Records",
                "requested_at": "2026-01-20T12:00:46.000Z",
                "timeline": [
                    {
                        "status": "pending",
                        "message": "Request submitted",
                        "created_at": "2026-01-20T12:00:46.000Z",
                        "updated_by": "Jane Registrar"
                    }
                ]
            },
            {
                "request_id": 2,
                "request_status": "pending",
                "document_name": "Certificate of Enrollment",
                "requested_at": "2026-01-20T12:00:46.000Z",
                "timeline": [
                    {
                        "status": "pending",
                        "message": "Request submitted",
                        "created_at": "2026-01-20T12:00:46.000Z",
                        "updated_by": "Jane Registrar"
                    }
                ]
            }
        ]
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}