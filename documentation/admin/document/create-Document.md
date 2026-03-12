--------------------------------------------------
##Create Document
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/documents

--------------------------------------------------
Body:Raw
--------------------------------------------------
{
  "document_name": "Certificate of ",
  "description": "Proof that the student is currently enrolled",
  "base_price": 100,
  "requirements": "Valid School ID",
  "estimated_processing_days": 2
}

--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Document created successfully"
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}