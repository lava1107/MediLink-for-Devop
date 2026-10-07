# MediLink – Backend API & Database

Node.js, Express, and MySQL backend for the **MediLink Medical Shop Management System**.

---

## 1. Prerequisites

- **Node.js**: v18+ (tested with v24.x)
- **MySQL**: MySQL Server 8.0+ or MySQL Workbench running on port `3306`

---

## 2. Environment Variables Setup

Copy `.env.example` to `.env`:

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` with your MySQL database credentials:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_ACTUAL_MYSQL_PASSWORD
DB_NAME=medilink
JWT_SECRET=medilink_secret_jwt_key_2026
CLIENT_URL=http://localhost:5173
```

---

## 3. Database Setup

You can initialize the database using either the automated setup script or MySQL Workbench / CLI.

### Option A: Automated Setup (Recommended)

Once you set your `DB_PASSWORD` in `backend/.env`, run:

```bash
cd backend
npm run db:setup
```

This command automatically:
1. Connects to your local MySQL server
2. Creates the `medilink` database
3. Runs `database/schema.sql` (creates all 17 normalized tables, foreign keys, indexes)
4. Runs `database/seed.sql` (populates demo branches, medicines, batches, customers, partner shops)

### Option B: MySQL Workbench or Command Line

1. Open **MySQL Workbench**.
2. Open `backend/database/schema.sql` and execute all queries.
3. Open `backend/database/seed.sql` and execute all queries.

Or via PowerShell / CMD:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

---

## 4. Install Dependencies

```bash
cd backend
npm install
```

---

## 5. Start Backend Server

```bash
cd backend
npm run dev
```

Server runs on: **`http://localhost:5000`**

Verify backend and database connection:
- Health Check: `http://localhost:5000/api/health`

Expected response:
```json
{
  "success": true,
  "message": "MediLink backend is running",
  "database": "connected",
  "timestamp": "..."
}
```

---

## 6. Start Frontend

In a separate terminal:

```bash
cd MediLink
npm run dev
```

Open browser at: **`http://localhost:5173`**

---

## 7. Demo Accounts

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `lavanya.admin` | `admin123` |
| **Pharmacist** | `rajan.pharmacist` | `pharma123` |

Or click the **Quick Demo Login** buttons on the login screen.

---

## 8. API Endpoint Reference

- **Auth**:
  - `POST /api/auth/login`: Authenticate user, return JWT token & user profile
  - `GET  /api/auth/me`: Validate JWT token, return authenticated user
  - `POST /api/auth/logout`: End session
- **Bootstrap**:
  - `GET  /api/bootstrap`: Load synchronized database entities for React AppContext
- **Branches**:
  - `GET / POST / PUT / DELETE /api/branches`
- **Categories**:
  - `GET / POST / PUT / DELETE /api/categories`
- **Users**:
  - `GET / POST / PUT / DELETE /api/users`
  - `PATCH /api/users/:id/status`: Activate/Deactivate user
- **Medicines**:
  - `GET / POST / PUT / DELETE /api/medicines`
- **Medicine Batches**:
  - `GET / POST / PUT / DELETE /api/batches`
- **Suppliers**:
  - `GET / POST / PUT / DELETE /api/suppliers`
- **Purchases**:
  - `GET  /api/purchases`: Get all purchases
  - `POST /api/purchases`: Atomic transaction creating purchase, purchase items, batches, and updating stock
- **Sales / POS**:
  - `GET  /api/sales`: Get all sales
  - `POST /api/sales`: Atomic transaction validating stock, batch expiry, prescription requirement, creating bill, reducing batch stock
- **Customers**:
  - `GET / POST / PUT / DELETE /api/customers`
- **Reservations**:
  - `GET  /api/reservations`: Get reservations
  - `POST /api/reservations`: Create reservation
  - `PATCH /api/reservations/:id/status`: Update status (`confirm`, `collect`, `cancel`)
- **Medicine Availability**:
  - `GET  /api/availability/check?query=...&branchName=...&branchRadius=...&partnerRadius=...`: 3-tier Haversine calculation
- **Partner Medical Shops**:
  - `GET / POST / PUT / DELETE /api/partner-shops`
  - `GET  /api/partner-shops/medicines`: Partner shop stock
- **Prescriptions**:
  - `GET  /api/prescriptions`: Get all prescriptions
  - `GET  /api/prescriptions/find?customerName=...&medicineName=...`: Find prescription
  - `POST /api/prescriptions`: Add prescription record
  - `PATCH /api/prescriptions/:id/verify`: Verify prescription
  - `PATCH /api/prescriptions/:id/reject`: Reject prescription
- **Dashboard**:
  - `GET  /api/dashboard/stats`: Real-time KPIs and chart metrics
- **Reports**:
  - `GET  /api/reports/:key`: 11 dynamic reports
- **Notifications**:
  - `GET   /api/notifications`: Get all alerts
  - `PATCH /api/notifications/:id/toggle`: Toggle read status
  - `PATCH /api/notifications/read-all`: Mark all as read
