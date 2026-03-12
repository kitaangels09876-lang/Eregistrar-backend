--------------------------------------------------
##check-payment-batch-id.md
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/payments/batch/:batch_id/check-payment

--------------------------------------------------
Response    (200 success)
--------------------------------------------------
{
    "status": "success",
    "hasPayment": true,
    "canUpload": true,
    "data": {
        "batch_id": 1,
        "payment_id": 1,
        "amount": "350.00",
        "payment_status": "pending",
        "payment_proof": null,
        "created_at": "2026-01-21T07:33:02.000Z"
    }
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}
