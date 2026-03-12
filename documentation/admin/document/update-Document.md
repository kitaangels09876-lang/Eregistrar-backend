--------------------------------------------------
#Update Document
--------------------------------------------------

#Prerequisites
    -Method
        PUT 
    -EndPoint
     http://localhost:3001/api/documents/:document_type_id

--------------------------------------------------
Body:raw
--------------------------------------------------
{
  "base_price": 250,
  "estimated_processing_days": 7,
  "is_active": false
}

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Document updated successfully"
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}