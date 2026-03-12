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
DB_USER=root
DB_PASSWORD=
DB_NAME=eRegistrar

JWT_SECRET=super_long_random_secret_here
JWT_EXPIRES_IN=1d

# ==========================================
# FRONTEND (IMPORTANT FOR CORS + COOKIES)
# ==========================================
FRONTEND_URL=http://localhost:3000


```
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

#postman

--------------------------------------------------
## Additional Resources
--------------------------------------------------
- [Express.js Documentation](https://expressjs.com/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Postman](https://www.postman.com/)

🚀 **Happy coding!**

