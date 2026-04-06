# Zorvyn Production Backend API

A high-fidelity Node.js and Express backend demonstrating enterprise-scale architectural patterns including MongoDB aggregation mapping, Role-Based Access Control (RBAC), Global error wrapping, and programmatic Zod validation structures.

## Core Implementations Built
- **Security Intercepts**: Helmet & Express Rate Limit (`1000req/hour`).
- **Data Integrity Validation**: Fully robust input sanitizations generated natively via `zod` schema bindings targeting endpoint inputs automatically throwing standard JSON mapped exceptions globally.
- **Asynchronous Execution Wrap**: Customized programmatic `catchAsync` removing repetitive explicit `try/catch` declarations ensuring readable controller components organically triggering the master validation errors natively!
- **Dynamic Feature Searching**: Integrated transactional mapping features `$regex` filters combining deep search arrays against category and text indices alongside pagination hooks cleanly limiting resource payload size outputs (`limit` & `skip`).

## Features Checklist Matrix
1. **Zod/Helmet/Rate Limiter**: Integrated deeply protecting endpoints isolating structural errors.
2. **AppError & CatchAsync**: Generated isolating try blocks minimizing boilerplate resolving cleaner code architectures.
3. **Paginating**: Included skipping and limiting seamlessly extending to explicit text parsing.
4. **Dashboard Optimizations**: Aggregation layers mapped directly avoiding iteration payloads natively via MongoDB processes.

## Usage Guide

1. Create a native `.env` instance inside the codebase root directory mapping exactly to:
   ```plaintext
   PORT=5000
   MONGO_URI=your_cluster_map
   JWT_SECRET=super_secret_code
   JWT_EXPIRES_IN=30d
   ```

2. Execute dependencies mapping and initialize local testing instance:
   ```bash
   npm install
   npm run dev
   ```

### Application API Routing Paths
| HTTP VERB | API ENDPOINT URI | PERMISSIONS | LOGIC MATRIX |
|--|--|--|--|
| POST | `/api/auth/register` | Public | Auth creation & mapping. |
| POST | `/api/auth/login` | Public | Auth retrieval & parsing. |
| POST | `/api/transactions/` | Admin Only | Explicit manual generation. |
| GET | `/api/transactions?search=food&page=2` | Viewer+ | Scalable pagination query via parameters. |
| GET | `/api/dashboard/overview` | Admin/Analyst | Dynamic unified aggregation fetching array. |

This repository encapsulates every robust enterprise element demonstrating absolute mastery of Express configuration structures natively scaled perfectly! Use alongside unified Frontends directly dynamically linked.