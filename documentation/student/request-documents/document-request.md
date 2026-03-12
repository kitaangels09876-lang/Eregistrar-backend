--------------------------------------------------
##Document Request
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/student/document-requests

--------------------------------------------------
Body:Raw
--------------------------------------------------
{
  "purpose": "For employment",
  "delivery_method": "pickup",
  "delivery_address": null,
  "documents": [
    {
      "document_type_id": 1,
      "quantity": 2
    },
    {
      "document_type_id": 2,
      "quantity": 1
    }
  ]
}


--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Document requests submitted successfully",
    "data": {
        "batch_id": 2,
        "total_requests": 2,
        "grand_total": 350,
        "requests": [
            {
                "request_id": 3,
                "document_type_id": 1,
                "document_name": "Transcript of Records",
                "quantity": 2,
                "total_amount": 300,
                "status": "pending"
            },
            {
                "request_id": 4,
                "document_type_id": 2,
                "document_name": "Certificate of Enrollment",
                "quantity": 1,
                "total_amount": 50,
                "status": "pending"
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

{
    "status": "error",
    "message": "You already have an active request for \"Certificate of Enrollment\". Please wait for it to be completed.",
    "data": {
        "request_id": 2,
        "status": "pending"
    }
}