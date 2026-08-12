# QuickCheck — Modern Phone Check-In Web Application

A minimalist, deployment-ready phone check-in web application backed by **Supabase PostgreSQL** (with Cloud DB fallback), built with React, TypeScript, Vite, and custom sleek CSS.

Live Demo: [https://asumi08.github.io/checkin-app/](https://asumi08.github.io/checkin-app/)  
GitHub Repository: [https://github.com/asumi08/checkin-app](https://github.com/asumi08/checkin-app)

---

## ✨ Features

1. **Instant Phone Check-In**:
   - Type a phone number, tap **Check In**, and see `Checked in: <Name>` immediately displayed on screen.
   - Total system check-in count automatically increments by +1 with smooth counter animation and particle celebration effects.

2. **Real Database Backend (Supabase + Cloud Fallback)**:
   - Full integration with Supabase PostgreSQL database tables (`customers` and `check_ins`).
   - Includes real-time database state sync, lifetime customer check-in history, and timestamp logging.
   - Includes automatic Cloud REST DB fallback if Supabase credentials are not provided, ensuring 100% operational status on live deployments.

3. **Bonus Feature — New Member Registration**:
   - If an entered phone number is not found in the database, the app automatically opens a sleek modal asking for the user's Full Name.
   - Submitting registers the new member into the database and immediately logs their first check-in (Count = 1).

4. **Live Activity Stream & Quick Testing**:
   - Real-time recent check-in feed with live timestamps, lifetime check-in badges, and instant search/filter.
   - Quick-select preset buttons (`555-0101`, `555-0102`, `555-0103`, `555-0199`) for fast, hassle-free testing.

---

## 🚀 Supabase Database Setup

To run with your own Supabase project:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the contents of [`supabase/schema.sql`](./supabase/schema.sql):

```sql
-- Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    check_in_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check-Ins Log Table
CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    check_in_number INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and public policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to customers" ON public.customers FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to check_ins" ON public.check_ins FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to check_ins" ON public.check_ins FOR INSERT WITH CHECK (true);
```

3. Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/asumi08/checkin-app.git
cd checkin-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 🚀 Deployment

The app is pre-configured for automated deployment to GitHub Pages:

```bash
npm run deploy
```

---

## 📝 Implementation Notes

- **Architecture**: Built using Vite + React 19 + TypeScript. Clean separation of concern between UI components (`App.tsx`), database layer (`lib/supabase.ts`), and API business logic (`services/api.ts`).
- **Resilience**: Designed with an adaptive backend abstraction layer. If Supabase keys are provided, it operates against PostgreSQL in Supabase. If running in isolated preview mode, it seamlessly transitions to a persistent cloud store adapter so the live demo URL functions out-of-the-box without requiring visitors to configure environment keys.
- **Challenges Faced & Solutions**:
  - *Challenge*: Handling non-numeric input variations in phone numbers.  
    *Solution*: Implemented a clean `normalizePhone` function that strips non-digits for database lookups while preserving friendly display formatting `(555) 000-0000` in the UI.
  - *Challenge*: Fast feedback loop for unknown members.  
    *Solution*: Built a non-intrusive modal workflow that pauses the check-in pipeline, captures the member's name, creates the DB record, and completes check-in in a single seamless user gesture.
