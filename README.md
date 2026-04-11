# eRegistrar-backEnd

=======================
--------------------------------------------------
## 1. Prerequisites
--------------------------------------------------
- Node.js (v12 or higher recommended)
- npm (Node Package Manager)
- Git

--------------------------------------------------
## 2. Clone the Repository from GitHub
--------------------------------------------------
### a. Open your terminal and run:
```
git clone https://github.com/QuivirCutanda/eRegistrar-backEnd.git
```
### b. Navigate into the project directory:
```
cd eRegistrar-backEnd
```

--------------------------------------------------
## 3. Environment Setup
--------------------------------------------------

### a. Import eRegistrar-database.sql file  manualy in your database (*phpMyAdmin, etc.).

### b. In the root directory of your project, create a file named `.env`.

### c. Add the following lines to your `.env` base on your database info:
```

PORT=3001
NODE_ENV=development


DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=eRegistrar

JWT_SECRET=super_long_random_secret_here
JWT_EXPIRES_IN=1d

# ==========================================
# FRONTEND (IMPORTANT FOR CORS + COOKIES)
# ==========================================
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# ==========================================
# EMAIL DELIVERY (SMTP / NODEMAILER)
# ==========================================
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_REPLY_TO=

EMAIL_VERIFICATION_SECRET=another_long_random_secret_here
EMAIL_VERIFICATION_EXPIRES_IN=1d

```

For hosted deploys, set the same variables in your hosting provider dashboard, or set one full MySQL connection string as:

```
DATABASE_URL=mysql://user:password@host:3306/database
```

On Render, you can also set `DATABASE_PUBLIC_URL` or `MYSQL_PUBLIC_URL` to the
public MySQL URL. These are preferred over `DATABASE_URL`, which is useful if
your provider also exposes a private/internal URL.

If the backend is deployed on Render and the database is on another provider,
do not use that provider's private/internal hostname for `DB_HOST`. Use the
public database host and port, or deploy the backend where the private hostname
is reachable.

### d. Install nodemodule:
```
npm install
```
--------------------------------------------------
## 4. Running the Application
--------------------------------------------------
### a. Open your terminal in the project directory.

### b. Start the server by running:
```
node server.ts
```

or you can use `nodemon` for automatic refresh:
```
npm i nodemon
nodemon server.ts
```

The server should now be running on:  http://localhost:3001

--------------------------------------------------
## 5. Testing the API
--------------------------------------------------
You can test the API endpoints using a tool like **Postman** or **cURL**.

Student self-registration now sends a verification email. The student account stays `inactive` until the user opens the `/api/auth/verify-email?token=...` link from the email.

#postman

--------------------------------------------------
## Additional Resources
--------------------------------------------------
- [Express.js Documentation](https://expressjs.com/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Postman](https://www.postman.com/)

🚀 **Happy coding!**
