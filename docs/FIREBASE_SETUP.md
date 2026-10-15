# Firebase Google Authentication Setup Guide
## Nachiyar Herbals & Cosmetics

This guide explains how to obtain and configure your Firebase Web credentials to enable official Google Sign-In with device account chooser (`select_account`).

---

### Step 1: Create or Open Your Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Sign in with your Google account.
3. If you don't already have a project for Nachiyar Herbals, click **"Add project"** (e.g. `nachiyar-herbals`).

---

### Step 2: Register a Web App & Copy Configuration
1. In your Firebase project dashboard, click the **Web icon (`</>`)** or go to **Project settings** (gear icon in the top left) &rarr; **General**.
2. Under the **"Your apps"** section at the bottom, click **"Add app"** &rarr; select **Web (`</>`)**.
3. Register the app with an app nickname (e.g. `Nachiyar Herbals Web`).
4. Firebase will display your `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyD-ExampleKey123456789",
     authDomain: "nachiyar-herbals.firebaseapp.com",
     projectId: "nachiyar-herbals",
     storageBucket: "nachiyar-herbals.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890",
     measurementId: "G-XXXXXXXXXX"
   };
   ```

---

### Step 3: Enable Google Sign-In Provider
1. In the left sidebar of the Firebase Console, navigate to **Build** &rarr; **Authentication**.
2. If this is your first time, click **"Get started"**.
3. Go to the **"Sign-in method"** tab.
4. Click on **Google** under the "Sign-in providers" list.
5. Toggle the **Enable** switch to ON.
6. Set the **Public-facing name for project** (e.g. `Nachiyar Herbals & Cosmetics`).
7. Choose your **Project support email** from the dropdown.
8. Click **Save**.

---

### Step 4: Add Authorized Domains
1. Still inside **Authentication**, click the **"Settings"** tab (next to "Sign-in method").
2. Select **"Authorized domains"** from the secondary menu.
3. Verify that the following domains are present in the list:
   - `localhost` (for local development)
   - `127.0.0.1` (optional local IP)
   - Your production domain (e.g., `nachiyarherbals.com` or your cPanel domain)
4. If your production domain is not listed, click **"Add domain"**, type your domain name, and click **Add**.

---

### Step 5: Configure Credentials in the Project

You can configure your Firebase keys using **either** of the following methods:

#### Method A: Environment Variables (Recommended)
Add the keys to your local `.env.development` file:
```env
FIREBASE_API_KEY=AIzaSyD-ExampleKey123456789
FIREBASE_AUTH_DOMAIN=nachiyar-herbals.firebaseapp.com
FIREBASE_PROJECT_ID=nachiyar-herbals
FIREBASE_STORAGE_BUCKET=nachiyar-herbals.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```
When deploying to cPanel or production, add the same keys to `.env.production`.

#### Method B: Direct in `firebase-config.js`
Alternatively, you can paste the values directly into `firebase-config.js`:
```javascript
const staticConfig = {
  apiKey: "AIzaSyD-ExampleKey123456789",
  authDomain: "nachiyar-herbals.firebaseapp.com",
  projectId: "nachiyar-herbals",
  storageBucket: "nachiyar-herbals.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX"
};
```

---

### Step 6: Restart the Node Server
Once you save your `.env.development` or `.env.production` file, restart the server:
```bash
node --disable-wasm-trap-handler server/src/index.js
```

---

### How the Sign-In Flow Works
1. When a customer clicks **"Sign in with Google"** in the customer drawer:
   - The browser directly invokes Firebase Auth with GoogleAuthProvider configured with `prompt: "select_account"`.
   - Google's official account chooser opens directly without any intermediate prompt asking customers to paste configuration.
2. The user selects any Google account stored on their device or clicks "Use another account".
3. Upon approval, Firebase returns the user profile and their unique **Firebase UID**.
4. The client sends `{ firebaseUid, email, name, picture }` to `/api/customer/google-auth`.
5. The PostgreSQL backend automatically creates a customer record with `customers.id = firebaseUid` if the customer does not already exist, or updates their profile if they do.
6. The customer drawer closes automatically and updates to show `Hi, [Customer Name]`.

---

### System Isolation Notice
- **Customer authentication only:** Admin login, staff accounts (inventory/billing), and the `/admin.html` dashboard are completely separate and unaffected by Google Sign-In.
- **Email/Password preserved:** Customers can still register manually or log in using traditional email/password credentials alongside Google Sign-In.
