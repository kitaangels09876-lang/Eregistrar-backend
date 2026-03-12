--------------------------------------------------
##dashboard/summary
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
     http://localhost:3001/api/dashboard/summary

--------------------------------------------------
Response    (200 success)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "totalRequests": 4,
        "totalStudents": 1,
        "totalCompleted": 1,
        "pendingRequests": 1,
        "processingRequests": 1,
        "forRelease": 0,
        "readyForPickup": 0,
        "totalRevenue": 50,
        "requestsByStatus": {
            "pending_payment": 1,
            "pending_verification": 1,
            "processing": 1,
            "for_release": 0,
            "ready_for_pickup": 0,
            "completed": 1,
            "rejected": 0
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