# MAMSS Prep 🎓

The official exam-preparation platform for **Mater Misericordiae Secondary School (MAMSS)**, Rumuomasi. Built to help SS1-SS3 students prepare for WAEC, NECO, and JAMB UTME.

<p align="center">
  <a href="https://3000-ifdfm14e4w4n6rrvecqaw.e2b.app"><strong>View Live Demo</strong></a>
</p>

## 🌟 Features

- **Study Hall (16 Tools)**: Flashcards, Rapid Fire sprints, Spelling Lab, Focus Pomodoro Timer, and more.
- **Live CBT Hall**: A complete JAMB UTME simulated environment with 4 subjects, active clock, question palette, on-screen calculator, and auto-submit scoring to /400.
- **Curriculum-True Practice**: Over 190+ expert-written questions across 9 subjects, categorized by Class (SS1-SS3) and Term.
- **Progress HQ**: Adaptive readiness score (0-100%), per-subject Mastery Map, Records Hall, and JSON backup/restore.
- **Tools**: Formula Vault, Periodic Table, Unit Converter, and Scientific Calculator.
- **v44 Carry**: compress this device's whole study record into one sync code and
  paste it on another phone — merge, never overwrite, no server involved.
- **v45 Roll Call**: school-issued one-time activation slips (`MAMSS-XXXXXX-YYYY`)
  open the app on one device. The site ships salted SHA-256 hashes only; the
  plaintext list stays on paper in the staff room. Details in `UPGRADE.md` §6.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + Framer Motion (Animations)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **3D Graphics**: React Three Fiber / Drei (Custom 3D interactive hero)
- **Icons**: Lucide React

## 📦 Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/merebari7-web/mamss-prep.git
   cd mamss-prep
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   Ensure you have a local PostgreSQL instance running. Create a `.env` file and add your database URL:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/mamss_db"
   ```

4. Push the schema and seed the question bank:
   ```bash
   npx drizzle-kit push
   npx tsx src/db/seed.ts
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## 🌐 Deployment

You can deploy this instantly to Vercel using the button below. Remember to configure a `DATABASE_URL` for your production PostgreSQL database (e.g., Supabase, Neon, or Vercel Postgres) during deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmerebari7-web%2Fmamss-prep&env=DATABASE_URL)

---
*Built for Morals and Excellence.*

---

## Deployment note (2026-09-20)

The GitHub Pages site at **https://merebari7-web.github.io/mamss-prep/** now serves a full
copy of the **My Personal Study App** static site (previously the lighter MAMSS Prep portal
with 195 questions). The static source lives in [`docs/`](docs/) and is kept in sync with
the `my-personal-study-app` repository. When you release an update of the study app, copy
the updated static files into `docs/`, update the `mamss-prep` URLs in `index.html`,
`robots.txt`, `sitemap.xml`, `manifest.webmanifest` and `quiz/atlas.js`, then commit —
GitHub Pages will republish automatically.
