# Sarthak & Manya Wedding Invitation — Data Architecture & Backend Setup

This document describes the complete architecture, setup, configuration, and deployment procedures for the **Sarthak & Manya Wedding Invitation** platform.

---

## 1. System Architecture Overview

```text
                  GUEST                                      ADMIN
                    │                                          │
                    ▼                                          ▼
          Wedding Invitation UI                          /admin/login
                    │                                          │
                    ▼                                          ▼
            Wishes Form Note                          POST /api/admin/login
                    │                                          │
                    ▼                                          ▼
            POST /api/wishes                          HttpOnly JWT Cookie
                    │                                          │
                    ▼                                          ▼
           Express Backend API                             /admin
                    │                                          │
                    ▼                                          ▼
            Mongoose ODM                              GET /api/admin/wishes
                    │                                          │
                    └───────────────────┬──────────────────────┘
                                        │
                                        ▼
                                  MongoDB Atlas
                              [wedding_invitation]
                                ├── guest_wishes
                                └── admins
```

---

## 2. MongoDB Atlas Configuration

### Step A: Locate Atlas Project
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Open project: **Manya Sarthak Wedding**.
3. Select your deployment cluster.

### Step B: Database Name
The application connects to the designated database:
```text
wedding_invitation
```

### Step C: Dedicated Application Database User (Security Best Practice)
Never use an Atlas Account Admin or root user for application runtime.
1. In Atlas, go to **Database Access** -> **Add New Database User**.
2. **Authentication Method**: Password.
3. **Username**: e.g., `wedding_app_user`.
4. **Password**: Generate a secure 24+ character password.
5. **Database User Privileges**:
   - Select **Built-in Role** -> **Read and write to any database** (or customize role specifically to `readWrite@wedding_invitation`).
6. Click **Add User**.

### Step D: Network Access (IP Whitelist)
1. In Atlas, go to **Network Access**.
2. For local development: Add your current IP address (or `0.0.0.0/0` temporarily with password protection if developing across dynamic connections).
3. For production: Add your production hosting server / container IP range.

---

## 3. Environment Variables Configuration

Copy `.env.example` to create `.env` in the project root:

```bash
cp .env.example .env
```

Fill in the values in `.env`:

```env
# MongoDB Atlas Connection String
# Replace <username>, <password>, and <cluster-url> with your Atlas credentials
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/wedding_invitation?retryWrites=true&w=majority

# Secret key for signing admin authentication JWT tokens (minimum 32 characters)
JWT_SECRET=replace_with_a_secure_random_production_secret

# Express Backend Port (Default: 5000)
PORT=5000

# Client origin for CORS (Default for Vite dev: http://localhost:5173)
CLIENT_URL=http://localhost:5173

# Credentials used to initialize the first administrator
ADMIN_EMAIL=admin@manyasarthak.wedding
ADMIN_PASSWORD=your_secure_admin_password_min_8_chars

# Frontend API URL (leave blank in dev to leverage Vite proxy, set in production)
VITE_API_BASE_URL=
```

> **IMPORTANT**: `.env` is listed in `.gitignore` and must never be committed to Git.

---

## 4. Administrator Account Setup

To bootstrap or update the administrator account, run:

```bash
npm run create-admin
```

This script:
1. Connects to the `wedding_invitation` database using `MONGODB_URI`.
2. Validates the provided `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. Hashes the password using **bcrypt** (salt rounds = 12).
4. Upserts the record into the `admins` collection with `role: "admin"` and `isActive: true`.
5. Exits cleanly without logging plaintext secrets.

---

## 5. Local Development Workflow

Run the backend and frontend simultaneously:

### Terminal 1: Backend Server (Port 5000)
```bash
npm run server
```

### Terminal 2: Frontend Client (Port 5173)
```bash
npm run dev
```

The frontend Vite server is configured to proxy all `/api/*` calls automatically to `http://localhost:5000`.

- Public Wedding Experience: `http://localhost:5173/`
- Admin Login Portal: `http://localhost:5173/admin/login`
- Admin Wishes Dashboard: `http://localhost:5173/admin`

---

## 6. Running Tests

The test suite validates both unit route logic and real end-to-end database operations:

```bash
npm test
```

Includes 26 automated tests covering:
- Guest wish valid submission and MongoDB persistence
- Guest input validation (empty name, whitespace, oversized input)
- Admin login authentication, bcrypt verification, and HttpOnly JWT issuance
- Rejection of invalid passwords and unauthorized requests
- Admin dashboard wishes retrieval sorted newest first
- Admin session termination via logout

---

## 7. Production Deployment

### Building Frontend
```bash
npm run build
```
Generates production-optimized static assets in `/dist`.

### Production Deployment Options
1. **Unified Server**: Serve the `/dist` directory as static files through Express in production.
2. **Decoupled Architecture**:
   - Frontend deployed on Vercel / Netlify / Cloudflare Pages (set `VITE_API_BASE_URL=https://api.yourdomain.com`).
   - Express Backend deployed on Render / Railway / Google Cloud Run / AWS ECS.
   - Configure `CLIENT_URL` in backend `.env` to match the custom domain of the frontend.

---

## 8. API Specification

### Public Endpoints

#### `GET /api/health`
Health check endpoint.
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "message": "Sarthak & Manya Wedding API is healthy",
  "timestamp": "2026-09-25T12:00:00.000Z"
}
```

#### `POST /api/wishes`
Allows wedding guests to submit blessings. Rate-limited to protect against spam.
- **Request Body**:
```json
{
  "name": "Rahul Sharma",
  "wishes": "Wishing you both a lifetime of happiness!"
}
```
- **Success Response**: `201 Created`
```json
{
  "success": true,
  "message": "Your wishes have been saved."
}
```
- **Error Response**: `400 Bad Request`
```json
{
  "success": false,
  "message": "Please share both your name and your blessing."
}
```

---

### Admin Endpoints

#### `POST /api/admin/login`
Authenticates the administrator and sets an HttpOnly JWT cookie. Rate-limited.
- **Request Body**:
```json
{
  "email": "admin@manyasarthak.wedding",
  "password": "your_secure_password"
}
```
- **Success Response**: `200 OK` (Sets `admin_token` HttpOnly cookie)
```json
{
  "success": true,
  "message": "Welcome back, Administrator.",
  "admin": {
    "email": "admin@manyasarthak.wedding",
    "role": "admin"
  }
}
```

#### `POST /api/admin/logout`
Invalidates and clears the admin authentication cookie.
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

#### `GET /api/admin/me`
Verifies active admin session.
- **Response**: `200 OK` or `401 Unauthorized`

#### `GET /api/admin/wishes`
Retrieves all submitted guest blessings ordered with newest submissions first. Requires `admin_token` cookie.
- **Response**: `200 OK`
```json
{
  "success": true,
  "count": 2,
  "wishes": [
    {
      "_id": "6740ad2f1e29c...",
      "name": "Rahul Sharma",
      "wishes": "Wishing you both a lifetime of happiness!",
      "createdAt": "2026-09-25T11:45:00.000Z"
    }
  ]
}
```

---

## 9. Guest Photo Collection

Guests scan **one common QR code** that opens `/photos`, enter their name, and upload up to
**10 photos (JPG, PNG, WEBP, HEIC/HEIF, max 20 MB each)**. There is no login and no public gallery.
Only administrators can see photos, in **Admin → Photo Collection**, which also generates the QR code
(PNG, plus SVG for print).

### Storage providers
Photos are saved through the `PhotoStorageProvider` interface (`server/storage/`). The upload page and
API don't depend on which provider is active.

| Provider | Use | Production uploads |
|----------|-----|--------------------|
| `local` | Development and testing only. Private folder `./.photo-uploads`, never served publicly | **Disabled** |
| Google Drive | Planned. Add an adapter in `server/storage/` and register it in `getProviderByName` | Enabled once connected and verified |

**Production safety:** with `NODE_ENV=production`, guest uploads stay **closed** unless the configured
provider is production-safe and ready. Uploads never fall back to local or temporary disk on Render.
The server logs `[Photos] Guest uploads OPEN/CLOSED` at startup, and the admin tab shows the same status.

### API
- `GET /api/photos/status`: whether uploads are open, plus limits
- `POST /api/photos/batches` `{ guestName }`: starts a submission and returns `batchId`
- `POST /api/photos/batches/:batchId/photos`: multipart field `photo`, one photo per request
- `GET /api/admin/photos` (admin): totals, uploads by guest, recent photos and failures, storage status
- `GET /api/admin/photos/:id/file` (admin): streams one photo (`?inline=1` to view)

### Protections
File type is checked from the file's content (not its name or MIME type). Other protections: 20 MB per
file, 10 photos per submission (enforced atomically), duplicate detection by SHA-256, per-IP rate limits
(kept generous for shared venue Wi-Fi), at most 4 uploads processed at once, a 1 GB free-disk floor,
temp-file cleanup on every request and at startup, and stored files named by random ID.
