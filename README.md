# Emprise Finance

A full-stack modern banking web application built with React 19, TypeScript, Vite, Tailwind CSS, and Firebase (Authentication & Firestore).

---

## 1. Firebase Setup

### Prerequisites
1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Email/Password** provider under **Build > Authentication > Sign-in method**.
3. Create a **Cloud Firestore** database under **Build > Firestore Database** in production mode.
4. Deploy the security rules and composite indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
5. Register a Web App in **Project Settings > General > Your Apps > Web App**, and copy your configuration credentials.

---

## 2. Environment Variables

Create a `.env` file in the project root:

```bash
# Firebase Web App Configuration
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:..."

# Optional Dev-Only Mock Mode (Disabled in production)
# When DEV is true and VITE_USE_MOCK="true", uses localStorage mock storage.
VITE_USE_MOCK="false"
```

---

## 3. Creating the First Admin Account

Because the client application enforces role-based access control, the first admin account must have `role: "admin"` in Firestore:

### Step 1: Create the User in Firebase Authentication
1. Go to **Firebase Console > Authentication > Users > Add user**.
2. Enter an email matching the internal auth format: `admin@emprise.internal` (or your chosen username, e.g. `superuser@emprise.internal`).
3. Set a secure password.
4. Copy the newly generated **User UID**.

### Step 2: Create the User Document in Firestore
1. Go to **Firebase Console > Firestore Database**.
2. In the `users` collection, add a document with Document ID set to the copied **User UID**:
   ```json
   {
     "uid": "<COPIED_USER_UID>",
     "username": "admin",
     "name": "System Administrator",
     "email": "admin@example.com",
     "role": "admin",
     "status": "active",
     "dob": "1980-01-01",
     "phone": "(555) 010-0000",
     "address": {
       "street": "100 Financial Way",
       "apt": "Suite 500",
       "city": "Chicago",
       "state": "IL",
       "zip": "60601"
     },
     "createdAt": "2026-01-01T00:00:00.000Z"
   }
   ```
3. In the application login screen, log in with username `admin` and the password you set in Firebase Authentication.
4. The application will authenticate with Firebase Auth, recognize the `admin` role, and redirect directly to `/admin`.

---

## 4. Architecture & Security Rules

- **Strict Production Enforcement**: Mock and demo modes are blocked in production. If Firebase environment variables are not supplied, the application renders a configuration notice screen.
- **Atomic Balance Updates & Audit Trail**: Customer transfers use Firestore `runTransaction`. All document reads execute before any writes.
- **Single Batch Account Creation**: User account setup (`users/{uid}`, `accounts/{accountId}`, `accountDirectory/{accountNumber}`, and initial opening transaction) executes atomically in a single `writeBatch`.
- **Security Rules (`firestore.rules`)**:
  - Customers can only read and access their own account and transactions.
  - Role (`role`) and status (`status`) fields cannot be modified by non-admin users.
  - Public registration only allows creating accounts with `role: "customer"` and `balanceCents: 0`.
  - Balance updates are validated with `getAfter()` against matching transaction ledger records.
  - Admins retain complete administrative access.
