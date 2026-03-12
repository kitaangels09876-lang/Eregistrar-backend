--------------------------------------------------
##Update Status
--------------------------------------------------

#Prerequisites
    -Method
        PUT 
    -EndPoint
     http://localhost:3001/api/requests/:requestId/status/update

*note STATUS FLOW: pending → processing → releasing → completed 
                or rejected

📌 Rules (IMPORTANT):
❌ dili pwede mo skip ug status
❌ dili pwede mo mobalik sa previous status
❌ dili pwede mo update kung completed na
rejected (can be applied anytime)
📌 Rules:

✅ pwede ma-reject bisan unsang stage
✅ optional ang rejection message
🔒 PERMANENT LOCK
→ once rejected, DILI NA GYUD PWede ma-update bisan unsa pa

============================================================
  raw
============================================================
{
  "status": "completed",
  "message": "Documents are now under completed"
}


============================================================
  200 ok
============================================================
{
    "status": "success",
    "message": "Request status updated to completed",
    "data": {
        "request_id": 1,
        "previous_status": "releasing",
        "current_status": "completed",
        "status_log_id": 8
    }
}