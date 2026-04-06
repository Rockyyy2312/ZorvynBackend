# 💰 Finance Dashboard Backend API

A scalable and well-structured backend system for managing financial data with **role-based access control (RBAC)** and **analytics APIs**.

This project demonstrates backend engineering skills including authentication, authorization, data modeling, aggregation, and clean architecture.

---

## 🚀 Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB + Mongoose**
* **JWT Authentication**
* **Zod/Joi (Validation)**
* **REST API Architecture**

---

## 📌 Features

### 🔐 Authentication & Authorization

* JWT-based authentication
* Role-Based Access Control (RBAC)

  * **Admin** → Full access
  * **Analyst** → Read + analytics
  * **Viewer** → Read-only

---

### 👤 User Management

* Register & login users
* Assign roles
* Manage active/inactive users

---

### 💰 Financial Records

* Create, update, delete transactions (Admin only)
* View transactions (all roles)
* Filter by:

  * Type (income/expense)
  * Category
  * Date range
* Pagination & search (optional)

---

### 📊 Dashboard Analytics

* Total income, expenses, net balance
* Category-wise breakdown
* Monthly trends (aggregation pipelines)
* Recent transactions

---

### ⚠️ Validation & Error Handling

* Input validation using Zod
* Centralized error handling
* Consistent API responses
* Proper HTTP status codes

---

## 🧠 Architecture Overview

This project follows a **layered architecture** with separation of concerns:

```
src/
│
├── config/        # Database & environment configuration
├── controllers/   # Handles request & response
├── services/      # Business logic (core logic lives here)
├── models/        # Mongoose schemas
├── routes/        # API route definitions
├── middleware/    # Auth, RBAC, error handling
├── utils/         # Helper functions (e.g., async wrapper, custom errors)
│
├── app.js         # Express app setup
└── server.js      # Server entry point
```

---

## 🧩 Design Principles

### 1. Separation of Concerns

* Controllers → handle HTTP layer
* Services → contain business logic
* Models → define data schema
* Middleware → reusable request processing

---

### 2. Role-Based Access Control (RBAC)

Implemented using middleware:

* `authMiddleware` → verifies JWT
* `authorizeRoles(...)` → restricts access

---

### 3. Scalable Structure

* Modular folder structure
* Easy to extend (add features like payments, reports, etc.)

---

### 4. Clean Code Practices

* Async/await used consistently
* Reusable utilities (error handler, async wrapper)
* Minimal logic inside controllers

---

## 🔑 Authentication Flow

1. User registers → password hashed using bcrypt
2. User logs in → receives JWT token
3. Token sent in headers:

   ```
   Authorization: Bearer <token>
   ```
4. Middleware verifies token and attaches user info to request

---

## 📊 API Endpoints

### 🔐 Auth

| Method | Endpoint           | Description   |
| ------ | ------------------ | ------------- |
| POST   | /api/auth/register | Register user |
| POST   | /api/auth/login    | Login user    |

---

### 💰 Transactions

| Method | Endpoint              | Access     |
| ------ | --------------------- | ---------- |
| POST   | /api/transactions     | Admin only |
| GET    | /api/transactions     | All roles  |
| GET    | /api/transactions/:id | All roles  |
| PUT    | /api/transactions/:id | Admin only |
| DELETE | /api/transactions/:id | Admin only |

#### Filters Example:

```
GET /api/transactions?type=expense&category=food&startDate=2024-01-01&endDate=2024-12-31
```

---

### 📊 Dashboard

| Method | Endpoint                  | Access         |
| ------ | ------------------------- | -------------- |
| GET    | /api/dashboard/summary    | All roles      |
| GET    | /api/dashboard/categories | Admin, Analyst |
| GET    | /api/dashboard/monthly    | Admin, Analyst |
| GET    | /api/dashboard/recent     | All roles      |

---

## ⚙️ Environment Variables

Create a `.env` file:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=30d
```

---

## ▶️ Setup Instructions

### 1. Clone Repository

```
git clone <repo-url>
cd project-folder
```

### 2. Install Dependencies

```
npm install
```

### 3. Setup Environment Variables

Create `.env` file as shown above

### 4. Run Server

```
npm start
```

---

## 📦 API Response Format

### ✅ Success

```javascript
{
  "success": true,
  "data": {...}
}
```

### ❌ Error

```javascript
{
  "success": false,
  "message": "Error message"
}
```

---

## ⚠️ Error Handling Strategy

* Centralized error middleware
* Custom error class (`AppError`)
* Async wrapper to avoid repetitive try-catch
* Handles:

  * Validation errors
  * JWT errors
  * MongoDB errors

---

## 🔒 Security Features

* Password hashing (bcrypt)
* JWT authentication
* Role-based access control
* Helmet
* Rate limiting

---

## 📈 Future Improvements

* Redis caching for analytics
* Swagger API documentation
* Unit & integration tests
* Docker containerization
* CI/CD pipeline

---

## 🎯 Key Highlights

* Clean and scalable backend architecture
* Efficient MongoDB aggregation pipelines
* Strong RBAC implementation
* Production-level error handling
* Well-structured and maintainable code

---

## 👨💻 Author

**Laukik Parashare**

---

## ⭐ Final Note

This project is designed to demonstrate backend engineering skills including:

* System design thinking
* Clean architecture
* Data processing & analytics
* Secure and maintainable API development
