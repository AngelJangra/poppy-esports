<!-- README.md -->
<p align="center">
  <img src="[POPPY_ESPORTS.png](https://i.ibb.co/pjzC80qW/POPPY-ESPORTS.png)" alt="POPPY ESPORTS Logo" width="120" />
</p>

<h1 align="center">🎮 POPPY ESPORTS</h1>
<p align="center">
  <strong>The Ultimate Free Tournament Platform</strong><br/>
  <em>No credit card • No hidden costs • Pure esports</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-environment-variables">Env Vars</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/supabase-✅-success?style=flat-square" alt="Supabase" />
  <img src="https://img.shields.io/badge/vercel-🚀-lightgrey?style=flat-square" alt="Vercel" />
</p>

---

## ✨ **About**

**POPPY ESPORTS** is a complete, production‑ready gaming tournament ecosystem. It includes a **user app** for players, an **admin panel** for full control, and a **landing page** to attract new users. All backed by **Supabase** (PostgreSQL + Auth + Realtime) and integrated with **Telegram** for instant deposit notifications – all **completely free**, with no credit card required.

---

## 🚀 **Features**

| Module | Capabilities |
|--------|--------------|
| **User App** | Signup/Login (Email + Google), Tournaments (join, view details, slot‑based registration), Wallet (recharge, withdraw, view transactions), Leaderboard, Real‑time chat, Referral system, Notifications |
| **Admin Panel** | Manage games, promotions, tournaments, users, withdrawals, deposits, referrals, leaderboard, theme, global settings (announcement bar, app update popup, policies) |
| **Landing Page** | Phone mockup with screenshots, animated download counters, feature grid, download buttons, dynamic developer call‑to‑action |
| **Telegram Integration** | Instant deposit alerts via a Telegram bot – admin receives user, amount, UTR, and screenshot link for quick verification |
| **Cost** | **$0** – Supabase free tier, Vercel free hosting, ImgBB free image upload, Telegram bot free |

---

## 🛠️ **Tech Stack**

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5, Swiper.js, Chart.js, jsPDF  
- **Backend (BaaS):** Supabase (PostgreSQL, Auth, Realtime, Webhooks)  
- **File Upload:** ImgBB API (free, no storage limits)  
- **Notifications:** Telegram Bot API  
- **Hosting:** Vercel (serverless functions + static hosting)  
- **Version Control:** Git + GitHub

---

## 📦 **Repository Structure**
poppy-esports/
├── api/
│ └── telegram-webhook.js # Serverless function for Telegram alerts
├── index.html # Landing page (root)
├── user.html # User application
├── admin.html # Admin panel
├── package.json # Dependencies for the webhook
├── vercel.json # Vercel routing configuration
└── README.md # You are here


---

## ⚡ **Quick Start**

### 1. **Prerequisites**
- A [Supabase](https://supabase.com) account (free tier, no CC).
- A Telegram account and [@BotFather](https://t.me/BotFather) to create a bot.
- A [Vercel](https://vercel.com) account (free tier, no CC).
- A GitHub account to host the repository.

### 2. **Setup Supabase**
- Create a new project and note your `Project URL` and `anon public key`.
- In the **SQL Editor**, run the schema provided in the [full SQL script](#) (included in the repo as `schema.sql` – you can create this file yourself from the guide).  
  > The schema creates all tables, enables RLS, and inserts default settings with `app_name = 'POPPY ESPORTS'`.

### 3. **Create Telegram Bot**
- Open Telegram, message `@BotFather`, and create a new bot. Copy the **bot token**.
- Send a message to your bot to initialise it.
- Get your **admin chat ID** by messaging `@userinfobot`.

### 4. **Deploy to Vercel**
- Fork or clone this repository to your GitHub.
- Go to Vercel, import the repo, and add these **environment variables**:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `TELEGRAM_BOT_TOKEN`
  - `ADMIN_CHAT_ID`
- Deploy – Vercel will automatically serve the static files and the webhook function.

### 5. **Create Admin User**
- Visit your deployed `user.html` (`/user`) and sign up with an email.
- In Supabase Dashboard, set `is_admin = true` for that user in the `users` table.
- Insert a row into `admin_config` with `admin_uid = user.id` and `setup_complete = true`.
- Now log in to `/admin` with full privileges.

---

## 🔧 **Environment Variables**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `SUPABASE_ANON_KEY` | Your Supabase public anon key |
| `TELEGRAM_BOT_TOKEN` | Token from BotFather (e.g., `123456:ABC-DEF`) |
| `ADMIN_CHAT_ID` | Your numeric Telegram chat ID (from @userinfobot) |

---

## 🧪 **Testing the Flow**

1. **User signs up** → receives signup bonus.  
2. **Admin creates a tournament** → appears in user app.  
3. **User joins** → fee deducted, player registered.  
4. **User recharges** → enters amount, UTR, uploads screenshot → deposit saved.  
5. **Telegram** → you get a notification.  
6. **Admin approves** deposit → balance updated automatically.  
7. **User requests withdrawal** → admin approves/rejects.

---

## 🤝 **Contributing**

Contributions are welcome! Feel free to open issues or submit pull requests for enhancements.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 **License**

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙌 **Acknowledgements**

- **Supabase** – for providing a robust, free backend.
- **ImgBB** – for effortless image hosting.
- **Vercel** – for seamless deployment.
- **Telegram** – for the real‑time notification API.
- **You** – for building the next big esports platform!

---

<p align="center">
  Made with ❤️ by <strong>POPPY ESPORTS</strong> – <em>Start Your Battle Today.</em>
</p>
