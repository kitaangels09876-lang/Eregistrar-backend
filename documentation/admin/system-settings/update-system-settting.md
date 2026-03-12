--------------------------------------------------
#Update System settings
--------------------------------------------------

#Prerequisites
    -Method
        PUT 
    -EndPoint
     http://localhost:3001/api/system-settings

--------------------------------------------------
Body:form-data
--------------------------------------------------
| KEY                   | TYPE | EXAMPLE VALUE                                       |
| --------------------- | ---- | --------------------------------------------------- |
| school_name           | Text | Trinidad Municipal College                          |
| school_short_name     | Text | TMC                                                 |
| school_email          | Text | [registrar@tmc.edu.ph](mailto:registrar@tmc.edu.ph) |
| school_contact_number | Text | +63 917 123 4567                                    |
| school_address        | Text | Poblacion, Trinidad, Bohol                          |
| school_website        | Text | [https://tmc.edu.ph](https://tmc.edu.ph)            |


--------------------------------------------------
Response    (200 OK)
--------------------------------------------------
{
    "status": "success",
    "message": "System settings updated successfully"
}
--------------------------------------------------
Error Response  400
--------------------------------------------------
{
  "status": "error",
  "message": "Authorization header missing"
}