# **New Pawnshop Backend **

## **Overview**
The **New Pawnshop Backend** is a robust server application designed to manage the backend functionality of a modern pawnshop platform. Built using **Node.js**, **Express**, and **MongoDB**, it incorporates features such as user authentication, secure data handling, and API documentation for seamless integration with client applications.

This documentation provides a comprehensive guide to the project's structure, key dependencies, and functionality.

---

## **Deployed Application**
The backend project is deployed and accessible via the following link:
**[Deployed Backend API](https://new-pawnshop-backend.onrender.com/docs/#/)**

> **Note:** For security, production endpoints may require authentication. Obtain API keys or credentials from the administrator.

---

## **Project Structure**

The backend is structured for scalability and maintainability. Below is the directory layout:

```
.
├── src
│   ├── controllers
│   │   └── [Handles business logic for routes]
│   ├── middlewares
│   │   └── [Custom middleware such as authentication]
│   ├── models
│   │   └── [Mongoose schemas for MongoDB]
│   ├── routes
│   │   └── [API route definitions]
│   ├── utils
│   │   └── [Utility functions like token generation]
│   ├── server.ts
│   │   └── [Application entry point]
├── .env
│   └── [Environment variable configuration]
├── package.json
│   └── [Project dependencies and scripts]
└── nodemon.json
    └── [Nodemon configuration for development]
```

### **Key Folders**

1. **`controllers/`**
   - Contains functions implementing the core logic for API endpoints. 
   - Example: `authController.ts` handles user authentication.

2. **`middlewares/`**
   - Contains reusable middleware such as request validation and JWT verification.
   - Example: `authMiddleware.ts` checks the validity of JSON Web Tokens.

3. **`models/`**
   - Contains Mongoose schemas for managing data in MongoDB.
   - Example: `User.ts` defines the schema for user data.

4. **`routes/`**
   - Contains API route definitions organized by functionality.
   - Example: `userRoutes.ts` includes endpoints like `/login` and `/register`.

5. **`utils/`**
   - Helper functions for tasks like hashing passwords or generating tokens.
   - Example: `tokenUtils.ts`.

6. **`server.ts`**
   - The entry point of the application, initializing Express, middleware, and routes.

---

## **Key Features**

### **Authentication**
- **JWT-based Authentication:** Secure and stateless user session management.
- **Password Hashing:** User passwords are encrypted using **bcrypt** for security.

### **API Documentation**
- Integrated **Swagger UI** for endpoint visualization and testing.
- Visit the documentation at **[Swagger API Docs](https://api.newpawnshop.com/docs)**.

### **Database**
- MongoDB is used for data storage, managed via **Mongoose**.
- Example collections:
  - `users`
  - `items`
  - `categories`
  - `transactions`

### **Cross-Origin Resource Sharing**
- Configured using **CORS** to allow secure interaction between the backend and the frontend.

---

## **Scripts**

### **Development**
```bash
npm run start
```
- Starts the application using **Nodemon** for hot-reloading.

### **Build**
```bash
npm run build
```
- Builds the project for production.

---

## **Environment Variables**

The project uses environment variables to manage sensitive information. Ensure to configure the following in a `.env` file:

```env
PORT=5000
DB_URL=mongodb+srv://<username>:<password>@cluster.example.com/dbname
JWT_SECRET=your_jwt_secret
```

---

## **Installation**

1. Clone the repository:
   ```bash
   git clone https://github.com/username/new-pawnshop-backend.git
   cd new-pawnshop-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env` file.

4. Start the server:
   ```bash
   npm run start
   ```

---

## **API Endpoints**

### **Base URL**
**https://api.newpawnshop.com**

### **Endpoints**

#### **Authentication**
- **POST** `/login`
  - **Description:** Authenticate a user and return a JWT token.
  - **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "password123"
    }
    ```

- **POST** `/register`
  - **Description:** Register a new user.
  - **Request Body:**
    ```json
    {
      "name": "John Doe",
      "email": "user@example.com",
      "password": "password123"
    }
    ```

#### **Items**
- **GET** `/items`
  - **Description:** Retrieve a list of all items.
  - **Query Parameters:** Optional filters like `category`, `price_range`.

- **POST** `/items`
  - **Description:** Add a new item.
  - **Request Body:** Requires user authentication.

---

## **Future Enhancements**
- Add caching mechanisms for frequently accessed endpoints.
- Implement GraphQL for advanced querying.
- Enable multi-language support for global accessibility.

---
