# 🚀 ClassBridge Deployment Guide
**TENSORA 2026 Hackathon | Problem Statement: EDU-02**

This guide provides step-by-step instructions for deploying ClassBridge:
1. **Frontend on Vercel** (Instant preview & production SPA)
2. **Backend on Render / Railway / Hugging Face Spaces** (Dockerized container for Whisper ASR & WebSockets)

---

## Part 1: Deploy Frontend to Vercel

Vercel CLI `v59.23.2` is already available on your machine. You can deploy either using the CLI or via GitHub.

### Method A: Deploy via Vercel CLI (Fastest — 2 Minutes)

Run the following command from the project root (`d:\EDU-02`):

```bash
npx vercel
```

When prompted:
1. **Set up and deploy?** → `Y`
2. **Which scope do you want to deploy to?** → Select your Vercel account / team.
3. **Link to existing project?** → `N`
4. **What's your project's name?** → `classbridge` (or press Enter)
5. **In which directory is your code located?** → `./`
6. Vercel will detect the project and [`vercel.json`](../vercel.json), and will build `frontend/dist`.

Once the preview URL is generated, deploy to production:
```bash
npx vercel --prod
```

---

### Method B: Deploy via Vercel Web Dashboard (GitHub)

1. **Push your code to GitHub:**
   ```bash
   git remote add origin https://github.com/<your-username>/classbridge.git
   git branch -M main
   git push -u origin main
   ```
2. Open **[vercel.com/new](https://vercel.com/new)** and import your `classbridge` repository.
3. **Project Settings:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (or `frontend`)
   - **Build Command:** `npm --prefix frontend run build`
   - **Output Directory:** `frontend/dist`
4. Click **Deploy**.

> [!NOTE]
> **Zero-Dependency Demo on Vercel:**  
> If deployed before the backend is linked, the app automatically runs in **Browser-Assisted Demo Mode**. Reviewers and judges can click **"Sample: ML & Optimization"** or **"Sample: Linear Algebra"** to test live dual-language captions, STEM domain tags, study guide generation, interactive flashcards, grounded Q&A with citations, and PDF downloads without any backend setup!

---

## Part 2: Deploy Backend (Render / Railway / Hugging Face)

Because the backend runs `faster-whisper` (int8-quantized) and long-lived WebSocket streaming, it runs best in a persistent Docker container.

### Deploying to Render (Free Tier)

1. Sign in to **[render.com](https://render.com)**.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Render will detect the [`render.yaml`](../render.yaml) or Dockerfile:
   - **Environment:** `Docker`
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Instance Type:** `Free`
   - **Port:** `8000`
5. *(Optional)* Add Environment Variable:
   - `GEMINI_API_KEY`: Your Google Gemini API Key (if you wish to use Gemini for enhanced note synthesis).
6. Click **Create Web Service**. Render will build the container and provide your live URL (e.g. `https://classbridge-backend.onrender.com`).

---

## Part 3: Connect Frontend to Your Live Cloud Backend

Once your backend is running on Render/Railway:

1. Open your **Vercel Project Dashboard**.
2. Go to **Settings** → **Environment Variables**.
3. Add:
   - `VITE_API_URL` = `https://your-backend.onrender.com`
   - `VITE_WS_URL` = `wss://your-backend.onrender.com`
4. Trigger a new deployment on Vercel (or push a commit).

Now your Vercel frontend is connected to your cloud Whisper streaming backend!
