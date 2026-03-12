--------------------------------------------------
## Register student
--------------------------------------------------

Creates a student account in `inactive` status and sends a verification email.
The account becomes `active` only after the user opens the email confirmation link.

# Prerequisites
    - Method
        POST
    - Endpoint
        http://localhost:3001/api/auth/register-student
    - Authentication
        Public
    - Content-Type
        application/json

--------------------------------------------------
Body (raw JSON)
--------------------------------------------------
Required fields:
{
  "email": "student21@sample.com",
  "password": "password123",
  "student_number": "2025-00011",
  "first_name": "Juan",
  "last_name": "Dela Cruz"
}

Optional fields:
{
  "middle_name": "Santos",
  "extension_name": null,
  "birthdate": "2002-05-10",
  "gender": "male",
  "contact_number": "09171234567",
  "course_id": 1,
  "year_level": "1st"
}

Allowed values for optional fields:
- `gender`: `male`, `female`, `other`
- `year_level`: any text value is accepted

Full example:
{
  "email": "student21@sample.com",
  "password": "password123",
  "student_number": "2025-00011",
  "first_name": "Juan",
  "middle_name": "Santos",
  "last_name": "Dela Cruz",
  "extension_name": null,
  "birthdate": "2002-05-10",
  "gender": "male",
  "contact_number": "09171234567",
  "course_id": 1,
  "year_level": "1st"
}

Validation notes:
- `password` must be at least 8 characters and contain at least one letter and one number
- `contact_number` must be a valid 11-digit Philippine mobile number like `09171234567`
- If you provide `gender`, it must be exactly one of: `male`, `female`, `other`
- If you provide `year_level`, any text value is accepted, such as `1st`, `First Year`, `Grade 11`, `Irregular`, or `Graduate`


--------------------------------------------------
Response    (201 created)
--------------------------------------------------
{
    "status": "success",
    "message": "Student account created successfully. Please check your email to activate it.",
    "user": {
        "user_id": 5,
        "email": "student21@sample.com",
        "account_type": "student",
        "status": "inactive"
    },
    "student": {
        "student_id": 3,
        "student_number": "2025-00011",
        "first_name": "Juan",
        "last_name": "Dela Cruz"
    }
}

After a successful registration:
- The backend sends a verification email to the registered address
- The user must open the email and click the activation link
- Login will stay blocked while the account status is `inactive`

--------------------------------------------------
Error Response  400
--------------------------------------------------
{
    "status": "error",
    "message": "Please correct the highlighted fields and try again.",
    "errors": [
        {
            "field": "email",
            "message": "Enter a valid email address."
        },
        {
            "field": "password",
            "message": "Password must contain at least one letter and one number."
        }
    ]
}

Other possible errors:
{
    "status": "error",
    "message": "Please correct the highlighted fields and try again.",
    "errors": [
        {
            "field": "email",
            "message": "This email is already registered."
        }
    ]
}

{
    "status": "error",
    "message": "Please correct the highlighted fields and try again.",
    "errors": [
        {
            "field": "student_number",
            "message": "This student number is already registered."
        }
    ]
}
