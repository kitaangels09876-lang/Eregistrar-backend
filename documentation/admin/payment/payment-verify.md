--------------------------------------------------
##Verify Payment
--------------------------------------------------

#Prerequisites
    -Method
        PUT 
    -EndPoint
    Default
     http://localhost:3001/api/api/payments/:paymentId/verify

--------------------------------------------------
Body:raw
--------------------------------------------------
        'verified',
        'rejected',

{
  "action": "verify", 
  "note": "Payment confirmed"
}

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "Payment verified successfully",
    "data": {
        "payment_id": 8,
        "payment_status": "verified",
        "verified_by": 1,
        "verified_at": "2025-12-29T14:45:37.212Z",
        "reason": null
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}