# Capacitor Android & iOS Mobile Preparation Guide

This guide details how to wrap the **MathTutor** frontend into a native Android and iOS mobile application using Capacitor, connecting to the same centralized cloud backend and AI inference service.

---

## 1. Architecture: Web to Mobile App

The future mobile app uses Capacitor as a native bridge:
- **Frontend UI:** Pre-built web assets packaged into the native APK/IPA.
- **Backend Communication:** Client fetch calls prepend `NEXT_PUBLIC_API_BASE` (e.g., `https://mathtutor.vercel.app` or custom domain `https://mathtutor.in`).
- **AI Inference:** The mobile app calls the same `/api/chat` route, which forwards requests to the cloud GPU (Modal / RunPod).
- **Authentication:** Token-based authentication or cross-origin session cookies with `SameSite=None; Secure`.

---

## 2. Server-Feature Compatibility & Static Export Audit

Next.js static export (`output: 'export'`) allows packaging an app into Capacitor's `out` folder. However, static export disables dynamic server runtime features.

### Server-Dependent Routes in MathTutor:
1. **Dynamic Server API Routes (`/api/*`):**
   - `/api/chat` (AI inference streaming & Bedrock/FastAPI proxy)
   - `/api/auth/login`, `/api/auth/signup`, `/api/auth/me`, `/api/auth/logout` (Argon2id hashing & session cookie manipulation)
   - `/api/admin/stats`, `/api/admin/students` (Direct database queries)
   *Impact:* In a pure static export, these API routes **cannot run inside the client device**. They must be hosted remotely (e.g. on Vercel) and called over HTTPS from the mobile app.
2. **Server-Rendered Pages (`/admin/dashboard`, `/student/dashboard`):**
   - If using Server Components (`cookies()`, `headers()`), they must either be converted to client components that fetch from the remote API, or kept on the web portal.

---

## 3. Step-by-Step Capacitor Installation & Build Commands

*(Execute these when ready to generate the Android APK)*

```bash
# 1. Install Capacitor core and CLI
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/android

# 2. Initialize Capacitor project
npx cap init MathTutor com.mathtutor.app --web-dir out

# 3. Configure NEXT_PUBLIC_API_BASE in .env.production
# NEXT_PUBLIC_API_BASE=https://mathtutor.in

# 4. Build static web assets for mobile
npm run build

# 5. Add Android native platform
npx cap add android

# 6. Synchronize web assets with the Android native project
npx cap sync android

# 7. Open the project in Android Studio to build APK or run on device
npx cap open android
```

---

## 4. CORS & Network Permissions in Android

In `android/app/src/main/AndroidManifest.xml`, ensure Internet permission is declared:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

The Next.js backend and FastAPI inference service have already been configured to permit origins:
- `capacitor://localhost`
- `http://localhost`
- Value of `ALLOWED_ORIGINS` (comma-separated).

