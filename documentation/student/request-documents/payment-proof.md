--------------------------------------------------
##Payment proof
--------------------------------------------------

#Prerequisites
    -Method
        POST 
    -EndPoint
     http://localhost:3001/api/student/payments/:payment_id/proof
     
*note:check pay document response for payment_id
--------------------------------------------------
Body:file 
--------------------------------------------------
key             type
payment_proof    file

--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Payment proof uploaded successfully",
    "data": {
        "payment": {
            "payment_id": 8,
            "payment_status": "submitted",
            "amount": "350.00",
            "created_at": "2025-12-29T14:24:33.000Z",
            "payment_proof": "/uploads/payments/payment_8_1767018278540.jpeg",
            "payment_method": {
                "method_id": 1,
                "method_name": "GCash",
                "send_to": "09171234567",
                "sender_name": "University Cashier"
            },
            "batch": {
                "batch_id": 4,
                "total_amount": "350.00",
                "status": "pending"
            }
        }
    }
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}