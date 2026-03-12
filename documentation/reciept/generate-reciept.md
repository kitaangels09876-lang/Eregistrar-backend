--------------------------------------------------
##generate-reciept.md
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/receipts/batch/:batch_id/generate

role:admin, registrar

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Receipt generated successfully",
    "data": {
        "receipt_id": 6,
        "receipt_reference": "OR-1770726834436-5",
        "pdf_path": "/uploads/receipts/receipt-OR-1770726834436-5.pdf"
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}