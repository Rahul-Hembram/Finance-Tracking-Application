
# 💰 Pocketwise – Finance Tracking Application

**Pocketwise** is a full-stack personal finance tracking application designed to help users manage their income, monitor expenses, and track their overall financial balance through an interactive dashboard.

The application provides secure user authentication, email OTP verification, and MongoDB-based data persistence.

## 📸 Project Screenshots

### Screenshot 1
![Pocketwise Screenshot 1](./Screenshot%202026-11-25%20093438.png)

### Screenshot 2
![Pocketwise Screenshot 2](./Screenshot%202026-11-25%20093527.png)

## ✨ Features

- **User Authentication:** Secure account registration and login.
- **Email OTP Verification:** Six-digit OTP-based email verification.
- **Finance Dashboard:** Track income, expenses, and total balance.
- **Income Management:** Record salary, freelance earnings, and other income.
- **Expense Tracking:** Add and monitor daily expenses.
- **MongoDB Persistence:** Store financial transactions securely.
- **Password Security:** Password hashing using bcrypt.
- **Session Management:** Secure internal session-based authentication.
- **API Security:** Helmet security headers and authentication rate limiting.
- **Responsive Interface:** React-based interactive dashboard.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Authentication | bcrypt, Secure Sessions, Email OTP |
| Security | Helmet |
| Development Tools | Git, GitHub, VS Code |

## 📂 Project Structure

```text
Finance-Tracking-Application/
│
├── public/
├── server/
├── src/
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Rahul-Hembram/Finance-Tracking-Application.git
```

### 2. Navigate to the project directory

```bash
cd Finance-Tracking-Application
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file using `.env.example` as a reference.

Configure the following:

```env
MONGODB_URI=your_mongodb_connection_string
```

Add SMTP settings if you want to enable real email OTP delivery.

**Important:** Never commit your actual `.env` file or expose database credentials.

### 5. Start the backend server

```bash
npm run server
```

### 6. Start the frontend

Open another terminal and run:

```bash
npm run dev
```

Open the application at:

```text
http://127.0.0.1:5173/
```

## 💡 Balance Calculation

The application calculates the user's available balance using:

```text
Total Balance = Total Income - Total Expenses
```

Users can add income and expense transactions, and the dashboard updates the financial summary using data stored in MongoDB.

## 🔐 Security

- Password hashing with bcrypt.
- Email OTP verification.
- Secure internal session management.
- Helmet security headers.
- Authentication rate limiting.
- Environment-based configuration.

## 👨‍💻 Author

**Rahul Hembram**

B.Tech Computer Science and Engineering

[GitHub](https://github.com/Rahul-Hembram)

---

⭐ If you find this project interesting, feel free to explore the repository!
