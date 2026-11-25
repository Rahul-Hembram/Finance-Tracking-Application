HEAD
# Finance-Tracking-Application

# Pocketwise

Pocketwise is a React/Vite finance dashboard with an Express API, MongoDB persistence, bcrypt password hashing, secure internal sessions, email OTP verification, Helmet security headers, and auth rate limiting. You do not need to manage JWT in the UI.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your MongoDB Atlas connection string.
3. Optionally add SMTP settings for real email delivery. Without SMTP, development displays the six-digit OTP on the signup screen.
4. Start the API with `npm run server`.
5. Start the frontend with `npm run dev`.

Open `http://127.0.0.1:5173/`. New users follow: create account -> receive six-digit email OTP -> verify email -> sign in. In development, if SMTP is not configured, the OTP is shown in the app so you can test immediately. Set `REQUIRE_EMAIL_VERIFICATION=true` in production.

## Balance calculation

The API stores income and expense entries per authenticated user. Total balance is calculated as:

`total income - total expenses`

Use **Add money movement** on the dashboard and select `Income` for salary or freelance deposits, or `Expense` for spending. The summary reloads from MongoDB after every entry.
 891177b (Add Finance Tracking Application project)
