# Frontend Deployment Guide: Next.js 16 on Vercel

This guide provides the exact procedure to deploy the **MathTutor** frontend and edge API gateway to Vercel with zero downtime.

---

## 1. Prerequisites & Git Preparation

1. Verify that all sensitive local `.env*` files are strictly ignored by Git:
   ```bash
   git status
   ```
   Ensure `.env.local` is never listed under changes to commit.
2. Push your latest code to your GitHub repository:
   ```bash
   git push origin main
   ```

---

## 2. Importing Project into Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Under **Import Git Repository**, select `ai-maths-tutor` (or your repository name).
4. **Project Configuration Settings:**
   - **Framework Preset:** `Next.js` (detected automatically).
   - **Root Directory:** If your repository root contains the `MathTutor` folder, click **Edit** and set Root Directory to `MathTutor`.
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** `.next` (default).
   - **Install Command:** `npm install` (default).

---

## 3. Configuring Environment Variables in Vercel

In the Vercel project setup screen (under **Environment Variables**), add the following:

| Key | Example Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz.neon.tech/mathtutor?sslmode=require` | Managed Neon PostgreSQL connection URI. |
| `BACKEND_URL` | `https://your-workspace--mathtutor-ai.modal.run` | Cloud GPU inference URL. |
| `UPSTASH_REDIS_REST_URL` | `https://prompt-lion-123.upstash.io` | Upstash Redis REST URL for rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | `AX12AbCdEf...` | Upstash Redis REST secret token. |
| `NEXT_PUBLIC_API_BASE` | `""` (leave empty for same origin) | Client API fetch base. |
| `ALLOWED_ORIGINS` | `https://mathtutor.in,https://mathtutor.vercel.app` | Allowed CORS origins. |
| `ADMIN_USERNAME` | `admin` | Initial admin username for seeding. |
| `ADMIN_PASSWORD` | `SecureAdmin@Maths2026!` | Initial master admin password. |
| `ADMIN_NAME` | `System Administrator` | Admin display name. |

Click **Deploy**. Vercel will build the Next.js application, compile 970+ static syllabus pages, package serverless functions, and assign a production URL (e.g., `https://mathtutor.vercel.app`).

---

## 4. Custom Domain Configuration (e.g., `mathtutor.in`)

To connect your purchased custom domain:
1. In Vercel, navigate to **Project Settings** > **Domains**.
2. Enter your domain (e.g. `mathtutor.in`) and click **Add**.
3. In your domain registrar (GoDaddy, Namecheap, Hostinger), configure DNS records:
   - **A Record:** Host `@` $\rightarrow$ Points to `76.76.21.21` (Vercel IP)
   - **CNAME Record:** Host `www` $\rightarrow$ Points to `cname.vercel-dns.com`
4. Vercel automatically issues and renews a free Let's Encrypt SSL/TLS certificate.

---

## 5. How to Verify PWA Installability in Chrome DevTools

1. Open your live Vercel URL in Google Chrome.
2. Press `F12` or `Ctrl + Shift + I` to open Chrome DevTools.
3. Select the **Application** tab.
4. **Inspect Manifest:** Click **Manifest** in the left sidebar:
   - Confirm Name is "MathTutor" and Short Name is "MathTutor".
   - Confirm Start URL is `/` and Display is `standalone`.
   - Verify the 192x192, 512x512, and maskable icons render without 404 errors.
5. **Inspect Service Worker:** Click **Service Workers** in the left sidebar:
   - Status should read: `Activated and is running`.
   - Scope should be `https://<your-domain>/`.
6. **Test Offline Fallback:**
   - In DevTools, go to the **Network** tab.
   - Change the throttling dropdown from *No throttling* to **Offline**.
   - Refresh the page: the customized `offline.html` screen will appear with a *"You're Offline"* notice and reload button.
7. **Test Native Installation:**
   - Look at the Chrome URL address bar: an **"Install MathTutor"** icon will appear on the right side.
   - Clicking it installs MathTutor as a standalone desktop/mobile application window.

---

## 6. Zero-Downtime Rollback Procedure

If a bad commit introduces an unexpected bug:
1. In the Vercel Dashboard, navigate to the **Deployments** tab.
2. Locate the previous working deployment.
3. Click the three dots (`...`) next to that deployment and select **Instant Rollback**.
4. Traffic is immediately redirected to the previous immutable build in < 1 second.

