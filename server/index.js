/* global process */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import dns from 'node:dns'
import nodemailer from 'nodemailer'

const app = express()
const port = Number(process.env.PORT || 4000)
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173'
const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(32).toString('hex'))
const mongoUri = process.env.MONGODB_URI
dns.setServers((process.env.DNS_SERVERS || '1.1.1.1,8.8.8.8').split(',').map((server) => server.trim()))

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long.')
}
if (!mongoUri || mongoUri.includes('<db_password>')) {
  throw new Error('MONGODB_URI is missing. Create a .env file from .env.example and replace <db_password> with your MongoDB Atlas password.')
}

app.use(helmet())
app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(express.json({ limit: '100kb' }))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }))

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  verificationCodeHash: String,
  verificationCodeExpiresAt: Date,
}, { timestamps: true })

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  description: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, maxlength: 60 },
  amount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, default: 'Other', maxlength: 40 },
  occurredAt: { type: Date, default: Date.now },
}, { timestamps: true })
const goalSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, name: { type: String, required: true, maxlength: 100 }, targetAmount: { type: Number, required: true, min: 1 }, savedAmount: { type: Number, default: 0, min: 0 }, targetDate: Date }, { timestamps: true })
const budgetSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, category: { type: String, required: true, maxlength: 60 }, monthlyLimit: { type: Number, required: true, min: 1 } }, { timestamps: true })
const investmentSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, name: { type: String, required: true, maxlength: 100 }, amount: { type: Number, required: true, min: 0 }, type: { type: String, default: 'Other', maxlength: 40 } }, { timestamps: true })

const User = mongoose.model('User', userSchema)
const Transaction = mongoose.model('Transaction', transactionSchema)
const Goal = mongoose.model('Goal', goalSchema)
const Budget = mongoose.model('Budget', budgetSchema)
const Investment = mongoose.model('Investment', investmentSchema)

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, emailVerified: user.emailVerified })
const signToken = (user) => jwt.sign({ sub: user._id.toString(), email: user.email }, jwtSecret, { expiresIn: '2h' })
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null

const sendVerificationCode = async (email, code) => {
  if (!mailer) return
  await mailer.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: email, subject: 'Your Pocketwise verification code', text: `Your Pocketwise verification code is ${code}. It expires in 10 minutes.` })
}

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const payload = jwt.verify(token, jwtSecret)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ message: 'Account not found.' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    if (!name || !email || password.length < 8) return res.status(400).json({ message: 'Name, email, and an 8-character password are required.' })
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' })
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' })
    const passwordHash = await bcrypt.hash(password, 12)
    const verificationCode = String(crypto.randomInt(100000, 1000000))
    const user = await User.create({ name, email, passwordHash, verificationCodeHash: hashToken(verificationCode), verificationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000) })
    await sendVerificationCode(email, verificationCode)
    res.status(201).json({ user: publicUser(user), verificationRequired: true, developmentOtp: mailer ? undefined : verificationCode })
  } catch {
    res.status(500).json({ message: 'Unable to create your account.' })
  }
})

app.post('/api/auth/verify-email', async (req, res) => {
  const codeHash = hashToken(String(req.body.code || ''))
  const user = await User.findOne({ email: String(req.body.email || '').trim().toLowerCase(), verificationCodeHash: codeHash, verificationCodeExpiresAt: { $gt: new Date() } })
  if (!user) return res.status(400).json({ message: 'That code is invalid or expired. Request a new code.' })
  user.emailVerified = true
  user.verificationCodeHash = undefined
  user.verificationCodeExpiresAt = undefined
  await user.save()
  res.json({ message: 'Email verified. You can now sign in.' })
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const user = await User.findOne({ email })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' })
  if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') return res.status(403).json({ message: 'Verify your email before signing in.' })
  res.json({ token: signToken(user), user: publicUser(user) })
})

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

app.get('/api/transactions', requireAuth, async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user._id }).sort({ occurredAt: -1 }).limit(500)
  res.json({ transactions })
})

app.post('/api/transactions', requireAuth, async (req, res) => {
  const type = req.body.type === 'income' ? 'income' : 'expense'
  const amount = Number(req.body.amount)
  const description = String(req.body.description || '').trim()
  const category = String(req.body.category || 'Other').trim()
  if (!description || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Description and a positive amount are required.' })
  const transaction = await Transaction.create({ userId: req.user._id, type, amount, description, category, paymentMethod: String(req.body.paymentMethod || 'Other'), occurredAt: req.body.occurredAt || new Date() })
  res.status(201).json({ transaction })
})

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  await Transaction.deleteOne({ _id: req.params.id, userId: req.user._id })
  res.status(204).end()
})

app.delete('/api/transactions', requireAuth, async (req, res) => {
  await Transaction.deleteMany({ userId: req.user._id })
  res.status(204).end()
})

const collectionRoutes = [
  { path: 'goals', Model: Goal, fields: { name: 'name', targetAmount: 'targetAmount', savedAmount: 'savedAmount', targetDate: 'targetDate' } },
  { path: 'budgets', Model: Budget, fields: { category: 'category', monthlyLimit: 'monthlyLimit' } },
  { path: 'investments', Model: Investment, fields: { name: 'name', amount: 'amount', type: 'type' } },
]
for (const { path, Model, fields } of collectionRoutes) {
  app.get(`/api/${path}`, requireAuth, async (req, res) => res.json({ [path]: await Model.find({ userId: req.user._id }).sort({ createdAt: -1 }) }))
  app.post(`/api/${path}`, requireAuth, async (req, res) => {
    const data = Object.fromEntries(Object.entries(fields).map(([key, field]) => [field, req.body[key]]))
    const item = await Model.create({ ...data, userId: req.user._id })
    res.status(201).json({ item })
  })
  app.patch(`/api/${path}/:id`, requireAuth, async (req, res) => {
    const data = Object.fromEntries(Object.entries(fields).filter(([key]) => req.body[key] !== undefined).map(([key, field]) => [field, req.body[key]]))
    const item = await Model.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, data, { new: true, runValidators: true })
    if (!item) return res.status(404).json({ message: 'Record not found.' })
    res.json({ item })
  })
  app.delete(`/api/${path}/:id`, requireAuth, async (req, res) => {
    await Model.deleteOne({ _id: req.params.id, userId: req.user._id })
    res.status(204).end()
  })
  app.delete(`/api/${path}`, requireAuth, async (req, res) => {
    await Model.deleteMany({ userId: req.user._id })
    res.status(204).end()
  })
}

app.get('/api/summary', requireAuth, async (req, res) => {
  const rows = await Transaction.find({ userId: req.user._id })
  const income = rows.filter((row) => row.type === 'income').reduce((total, row) => total + row.amount, 0)
  const expenses = rows.filter((row) => row.type === 'expense').reduce((total, row) => total + row.amount, 0)
  res.json({ income, expenses, balance: income - expenses })
})

mongoose.connect(mongoUri).then(() => {
  app.listen(port, () => console.log(`API running on http://localhost:${port}`))
}).catch((error) => {
  console.error('MongoDB connection failed:', error.message)
  process.exit(1)
})
