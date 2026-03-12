--------------------------------------------------
## Get school info
--------------------------------------------------

# Prerequisites
    - Method
        GET
    - Endpoint
    default
        http://localhost:3001/api/system-settings
        
--------------------------------------------------
response (200 OK)
--------------------------------------------------
{
    "status": "success",
    "data": {
        "id": 1,
        "school_name": "Trinidad Municipal College",
        "school_short_name": "TMC",
        "school_email": "registrar@tmc.edu.ph",
        "school_contact_number": "+63 917 123 4567",
        "school_address": "Poblacion, Trinidad, Bohol",
        "school_website": "https://tmc.edu.ph",
        "school_logo": "/uploads/system/logo.png",
        "school_seal": "/uploads/system/seal.png",
        "school_icon": "/uploads/system/icon.png",
        "updated_at": "2026-01-19T03:12:52.000Z",
        "updated_by": null
    }
}