# CalmPrep

A GenAI wellness companion that helps students monitor and improve their mental
well-being during high-stakes exams (NEET / JEE / CAT / GATE / UPSC). Built for
the PromptWars hackathon.

## About

CalmPrep pairs a daily wellness check-in with an AI companion that tracks mood,
stress, sleep, and focus over time, surfaces trends, and offers grounded,
supportive guidance when students need it most. It is built on the **Next.js App
Router**, styled with **Tailwind CSS v4** and **shadcn/ui** (New York style), and
written entirely in **TypeScript**.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS v4, shadcn/ui (New York) |
| Language | TypeScript |
| AI | Google Gemini (`@google/genai`, `gemini-2.5-flash`) |
| Data | Supabase (`@supabase/supabase-js` + `@supabase/ssr`, RLS) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Notifications | Sonner |
| Theme | next-themes (dark mode) |

## Requirements

- Node.js v20 or higher

> If you experience issues with a Node.js version above v20, switch to v20 LTS.

## Installation

**1. Clone the repository:**

```sh
git clone https://github.com/praxxOp/calmprep.git
cd calmprep
```

**2. Install dependencies:**

```sh
npm install
```

If you run into peer dependency errors, add the `--legacy-peer-deps` flag:

```sh
npm install --legacy-peer-deps
```

**3. Configure environment variables:**

Create a `.env.local` with your Gemini and Supabase credentials.

**4. Start the development server:**

```sh
npm run dev
```

**5. Open [http://localhost:3000](http://localhost:3000) in your browser.**

To start customizing, explore the files inside the `app/` and `components/` directories.
