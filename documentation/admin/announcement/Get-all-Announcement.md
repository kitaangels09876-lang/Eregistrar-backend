--------------------------------------------------
##dashboard/summary
--------------------------------------------------

#Prerequisites
    -Method
        GET 
    -EndPoint
    Default
     http://localhost:3001/api/announcements
    pagination
     http://localhost:3001/api/announcements?page=2&limit=5
    Search
     http://localhost:3001/api/announcements?search=holiday
    Combined
     http://localhost:3001/api/announcements?page=1&limit=10&search=TMC

--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "pagination": {
        "totalRecords": 5,
        "totalPages": 1,
        "currentPage": 1,
        "limit": 10
    },
    "data": [
        {
            "announcement_id": 5,
            "title": "TMC | Holiday Non Working Days",
            "start_date": "2025-11-01",
            "end_date": "2025-11-05",
            "message": "updated",
            "posted_by": "System Administrator",
            "created_by": 1,
            "created_at": "2025-12-28T08:06:53.000Z"
        },
        {
            "announcement_id": 4,
            "title": "TMC | Holiday Non Working Days",
            "start_date": "2025-11-01",
            "end_date": "2025-11-05",
            "message": "Kindly plan your schedules and pending tasks accordingly. All operations and office activities will resume on the next regular working day following the holiday.\n\nWe wish everyone a safe and joyful holiday season!",
            "posted_by": "System Administrator",
            "created_by": 1,
            "created_at": "2025-12-28T08:03:41.000Z"
        },
        {
            "announcement_id": 3,
            "title": "TMC | Holiday Non Working Days",
            "start_date": "2025-11-01",
            "end_date": "2025-11-05",
            "message": "Kindly plan your schedules and pending tasks accordingly. All operations and office activities will resume on the next regular working day following the holiday.\n\nWe wish everyone a safe and joyful holiday season!",
            "posted_by": "System Administrator",
            "created_by": 1,
            "created_at": "2025-12-28T08:03:05.000Z"
        },
        {
            "announcement_id": 2,
            "title": "TMC | Holiday Non Working Days",
            "start_date": "2025-11-01",
            "end_date": "2025-11-05",
            "message": "Kindly plan your schedules and pending tasks accordingly. All operations and office activities will resume on the next regular working day following the holiday.\n\nWe wish everyone a safe and joyful holiday season!",
            "posted_by": "System Administrator",
            "created_by": 1,
            "created_at": "2025-12-28T08:00:37.000Z"
        },
        {
            "announcement_id": 1,
            "title": "TMC | Holiday Non Working Days",
            "start_date": "2025-11-01",
            "end_date": "2025-11-05",
            "message": "Kindly plan your schedules and pending tasks accordingly. All operations and office activities will resume on the next regular working day following the holiday.\n\nWe wish everyone a safe and joyful holiday season!",
            "posted_by": "System Administrator",
            "created_by": 1,
            "created_at": "2025-12-28T08:00:31.000Z"
        }
    ]
}

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}