import { useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  Home,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

const navItems = [
  { label: 'Overview', icon: Home },
  { label: 'Transactions', icon: ReceiptText },
  { label: 'Budgets', icon: LayoutGrid },
  { label: 'Goals', icon: Target },
  { label: 'Investments', icon: TrendingUp },
]

const initialTransactions = []
const api = async (path, options = {}) => {
  const token = localStorage.getItem('pocketwise_token')
  let response
  try {
    response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } })
  } catch {
    throw new Error('Cannot reach the finance server. Start the API with npm run server and configure .env first.')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'Something went wrong.')
  return payload
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('pocketwise_token')))
  const [authMode, setAuthMode] = useState('signup')
  const [authBusy, setAuthBusy] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [activeNav, setActiveNav] = useState('Overview')
  const [isDark, setIsDark] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAssistant, setShowAssistant] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [activeDialog, setActiveDialog] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [period, setPeriod] = useState('This month')
  const [currency, setCurrency] = useState('₹')
  const [loginError, setLoginError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [autoCategorize, setAutoCategorize] = useState(true)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0 })
  const [goals, setGoals] = useState([])
  const [budgets, setBudgets] = useState([])
  const [investments, setInvestments] = useState([])
  const [assistantText, setAssistantText] = useState('')
  const [messages, setMessages] = useState([{ from: 'ai', text: 'Your finance space is ready. Add an expense or ask me for a budgeting plan.' }])

  const handleLogin = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    setAuthBusy(true)
    setLoginError('')
    try {
      const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: form.get('password') }) })
      localStorage.setItem('pocketwise_token', result.token)
      setAccountEmail(result.user.email)
      setAccountName(result.user.name)
      setIsLoggedIn(true)
    } catch (error) { setLoginError(error.message) } finally { setAuthBusy(false) }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setAuthBusy(true)
    setLoginError('')
    try {
      const result = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password') }) })
      setVerificationEmail(String(form.get('email')).trim().toLowerCase())
      setAuthMessage(result.developmentOtp ? `Development mode code: ${result.developmentOtp}` : 'We sent a six-digit code to your email.')
      setAuthMode('verify')
    } catch (error) { setLoginError(error.message) } finally { setAuthBusy(false) }
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setAuthBusy(true)
    setLoginError('')
    try {
      await api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ email: verificationEmail, code: form.get('code') }) })
      setAuthMessage('Email verified. You can now sign in securely.')
      setAuthMode('login')
    } catch (error) { setLoginError(error.message) } finally { setAuthBusy(false) }
  }

  const loadAccountData = async () => {
    try {
      const [userResult, transactionResult, summaryResult, goalsResult, budgetsResult, investmentsResult] = await Promise.all([api('/api/auth/me'), api('/api/transactions'), api('/api/summary'), api('/api/goals'), api('/api/budgets'), api('/api/investments')])
      setAccountName(userResult.user.name)
      setAccountEmail(userResult.user.email)
      setTransactions(transactionResult.transactions.map((transaction) => ({ ...transaction, rawAmount: transaction.amount, name: transaction.description, amount: `${transaction.type === 'income' ? '+' : '-'}${currency}${transaction.amount.toLocaleString('en-IN')}`, date: new Date(transaction.occurredAt).toLocaleDateString(), icon: transaction.type === 'income' ? 'IN' : 'EX', tone: transaction.type === 'income' ? 'green' : 'purple' })))
      setSummary(summaryResult)
      setGoals(goalsResult.goals)
      setBudgets(budgetsResult.budgets)
      setInvestments(investmentsResult.investments)
    } catch { localStorage.removeItem('pocketwise_token'); setIsLoggedIn(false) }
  }

  // The session bootstrap intentionally hydrates React state from the authenticated API.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (isLoggedIn) loadAccountData() }, [isLoggedIn])

  const handleAddExpense = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/transactions', { method: 'POST', body: JSON.stringify({ type: form.get('type') || 'expense', description: form.get('description'), category: form.get('category'), amount: Number(form.get('amount')) }) })
      await loadAccountData()
      setShowAddExpense(false)
    } catch (error) { setLoginError(error.message) }
  }


  const sendMessage = (event) => {
    event.preventDefault()
    if (!assistantText.trim()) return
    setMessages((current) => [
      ...current,
      { from: 'user', text: assistantText },
      { from: 'ai', text: 'I am on it. Based on your current cash flow, you can safely move ₹6,000 to your emergency fund this month.' },
    ])
    setAssistantText('')
  }

  const selectSection = (section) => {
    setActiveNav(section)
    setShowMobileMenu(false)
    setShowSearch(false)
  }

  const closeDialog = () => setActiveDialog('')

  if (!isLoggedIn) {
    return <div className="login-shell"><div className="login-brand"><span className="brand-mark"><Sparkles size={17} /></span><span>pocketwise</span></div><div className="login-card"><div className="login-icon"><Sparkles size={20} /></div><p className="eyebrow">YOUR MONEY, YOUR WAY</p><h1>{authMode === 'signup' ? 'Create your account' : authMode === 'verify' ? 'Check your email' : 'Welcome back'}</h1><p className="login-copy">{authMode === 'signup' ? 'Start with a secure personal workspace for your finances.' : authMode === 'verify' ? `Enter the six-digit code sent to ${verificationEmail}.` : 'Sign in to continue to your private finance workspace.'}</p>{authMessage && <p className="auth-message">{authMessage}</p>}{authMode === 'verify' ? <form onSubmit={handleVerify}><label>Verification code<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" placeholder="000000" required /></label><button className="primary-button login-submit" disabled={authBusy}>{authBusy ? 'Checking...' : 'Verify email'} <Check size={16} /></button>{loginError && <p className="form-error">{loginError}</p>}</form> : <form onSubmit={authMode === 'signup' ? handleRegister : handleLogin}>{authMode === 'signup' && <label>Full name<input name="name" placeholder="Your name" required /></label>}<label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" placeholder="At least 8 characters" minLength="8" required /></label><button className="primary-button login-submit" disabled={authBusy}>{authBusy ? 'Please wait...' : authMode === 'signup' ? 'Create account' : 'Sign in'} <ChevronRight size={16} /></button>{loginError && <p className="form-error">{loginError}</p>}</form>}<button className="auth-switch" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setLoginError(''); setAuthMessage('') }}>{authMode === 'signup' ? 'Already have an account? Sign in' : authMode === 'verify' ? 'Use a different email' : 'New here? Create an account'}</button><div className="login-divider"><span>Secure personal workspace</span></div><p className="login-foot"><ShieldCheck size={14} /> Your data stays private and encrypted</p></div></div>
  }

  const searchableItems = [...transactions.map((item) => ({ ...item, searchType: 'Transaction' })), ...goals.map((item) => ({ ...item, name: item.name, category: 'Goal', amount: `Target ${currency}${item.targetAmount}`, searchType: 'Goal' })), ...budgets.map((item) => ({ ...item, name: item.category, category: 'Budget', amount: `${currency}${item.monthlyLimit}`, searchType: 'Budget' })), ...investments.map((item) => ({ ...item, category: item.type, amount: `${currency}${item.amount}`, searchType: 'Investment' }))]
  const searchResults = searchQuery.trim() ? searchableItems.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(searchQuery.toLowerCase())) : searchableItems
  const expenseByCategory = transactions.filter((item) => item.type === 'expense').reduce((result, item) => { result[item.category] = (result[item.category] || 0) + item.rawAmount; return result }, {})
  const maxCategoryExpense = Math.max(...Object.values(expenseByCategory), 1)
  const chartValues = Array.from({ length: 12 }, (_, index) => transactions.filter((item) => item.type === 'expense' && new Date(item.occurredAt).getMonth() === index).reduce((total, item) => total + item.rawAmount, 0))
  const maxChartValue = Math.max(...chartValues, 1)

  return (
    <div className={`app-shell ${isDark ? 'dark' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>pocketwise</span></div>
        <div className="workspace-label">PERSONAL SPACE</div>
        <nav className="nav-list">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => selectSection(label)}>
              <Icon size={18} strokeWidth={activeNav === label ? 2.3 : 1.8} /><span>{label}</span>
              {label === 'Goals' && goals.length > 0 && <span className="nav-count">{goals.length}</span>}
            </button>
          ))}
        </nav>
        <div className="workspace-label bottom-label">YOUR SPACE</div>
        <nav className="nav-list">
          <button className="nav-item" onClick={() => setShowAssistant(true)}><MessageCircle size={18} /><span>AI Advisor</span><span className="online-dot" /></button>
          <button className={`nav-item ${showNotifications ? 'active' : ''}`} onClick={() => setShowNotifications((value) => !value)}><Bell size={18} /><span>Notifications</span><span className="notification-count">2</span></button>
          <button className={`nav-item ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(true)}><Settings size={18} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Zap size={16} /></div><strong>Unlock your potential</strong><span>Get more from your money with Pro insights.</span><button>Explore Pro <ChevronRight size={14} /></button></div>
          <button className="profile-row" onClick={() => setShowProfile((value) => !value)}><div className="avatar">AS</div><div><strong>{accountName}</strong><span>Personal account</span></div><ChevronDown size={15} /></button>
          {showProfile && <div className="profile-menu"><button onClick={() => { setShowProfile(false); setActiveDialog('profile') }}><UserRound size={14} /> Profile details</button><button onClick={() => { setShowProfile(false); setActiveDialog('security') }}><LockKeyhole size={14} /> Security & privacy</button><button onClick={() => { localStorage.removeItem('pocketwise_token'); setShowProfile(false); setIsLoggedIn(false); setAuthMode('login') }}><LogOut size={14} /> Sign out</button></div>}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setShowMobileMenu((value) => !value)} aria-label="Open menu"><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav}</strong></div><div className="topbar-actions"><button className={`icon-button ${showSearch ? 'selected' : ''}`} onClick={() => setShowSearch((value) => !value)} aria-label="Search"><Search size={18} /></button><button className="icon-button" onClick={() => setIsDark((value) => !value)} aria-label="Toggle theme">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button><button className={`icon-button notification-button ${showNotifications ? 'selected' : ''}`} onClick={() => setShowNotifications((value) => !value)} aria-label="Notifications"><Bell size={18} /><i /></button><button className="top-avatar" onClick={() => setShowProfile((value) => !value)} aria-label="Open profile">{accountName.slice(0, 2).toUpperCase()}</button></div></header>
        {showMobileMenu && <div className="mobile-nav"><div className="workspace-label">PERSONAL SPACE</div>{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => selectSection(label)}><Icon size={17} /><span>{label}</span></button>)}<button className="nav-item" onClick={() => setShowSettings(true)}><Settings size={17} /><span>Settings</span></button></div>}
        {showSearch && <div className="search-popover"><Search size={17} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search transactions, categories..." /><button onClick={() => { setShowSearch(false); setSearchQuery('') }} aria-label="Close search"><X size={16} /></button><div className="search-results">{searchResults.slice(0, 4).map((transaction) => <button key={`${transaction.name}-${transaction.date}`} onClick={() => { setShowSearch(false); setSearchQuery('') }}><span className={`transaction-icon ${transaction.tone}`}>{transaction.icon}</span><span><strong>{transaction.name}</strong><small>{transaction.category} · {transaction.amount}</small></span></button>)}{searchResults.length === 0 && <p>No matching transactions</p>}</div></div>}
        {showNotifications && <div className="notifications-popover"><div className="popover-title"><strong>Notifications</strong><button onClick={() => setShowNotifications(false)}><X size={15} /></button></div><div className="notification-item"><span className="notice-icon green"><TrendingUp size={14} /></span><span><strong>Budget looking good</strong><small>You are ₹11,760 under budget this month.</small></span></div><div className="notification-item"><span className="notice-icon purple"><Target size={14} /></span><span><strong>Goal update</strong><small>Your laptop goal is 75% complete.</small></span></div></div>}

        <div className={`page-body ${activeNav !== 'Overview' ? 'section-page' : ''}`}>
          {activeNav !== 'Overview' && <section className="section-view"><div className="section-heading"><div><p className="eyebrow">WORKSPACE</p><h1>{activeNav}</h1><p className="subhead">Manage your {activeNav.toLowerCase()} in one place.</p></div>{(activeNav === 'Transactions' || activeNav === 'Goals') && <button className="primary-button" onClick={() => activeNav === 'Goals' ? setActiveDialog('goal') : setShowAddExpense(true)}><Plus size={17} /> {activeNav === 'Goals' ? 'Add goal' : 'Add expense'}</button>}</div>{activeNav === 'Transactions' && (transactions.length ? <div className="panel section-list">{transactions.map((transaction) => <div className="transaction" key={`${transaction.name}-${transaction.date}`}><div className={`transaction-icon ${transaction.tone}`}>{transaction.icon}</div><div className="transaction-info"><strong>{transaction.name}</strong><span>{transaction.category} · {transaction.date}</span></div><strong>{transaction.amount}</strong></div>)}</div> : <div className="empty-section"><ReceiptText size={28} /><h2>No transactions yet</h2><p>Your fresh workspace is empty. Add your first expense to start tracking.</p><button className="primary-button" onClick={() => setShowAddExpense(true)}><Plus size={16} /> Add your first expense</button></div>)}{activeNav === 'Budgets' && (budgets.length ? <div className="panel section-list">{budgets.map((budget) => <div className="budget-entry" key={budget.category}><strong>{budget.category}</strong><span>{currency}{budget.amount} monthly limit</span></div>)}</div> : <div className="empty-section"><LayoutGrid size={28} /><h2>Create your first budget</h2><p>Set a monthly limit for food, transport, bills, or any category.</p><button className="primary-button" onClick={() => setActiveDialog('budget')}><Plus size={16} /> Create budget</button></div>)}{activeNav === 'Goals' && (goals.length ? <div className="panel section-list">{goals.map((goal) => <div className="budget-entry" key={goal.name}><strong>{goal.name}</strong><span>Target {currency}{goal.amount}</span></div>)}</div> : <div className="empty-section"><Target size={28} /><h2>No goals yet</h2><p>Give your money a purpose and track progress toward something meaningful.</p><button className="primary-button" onClick={() => setActiveDialog('goal')}><Plus size={16} /> Create a goal</button></div>)}{activeNav === 'Investments' && <div className="empty-section"><TrendingUp size={28} /><h2>No investments connected</h2><p>Connect an account later to see your portfolio and growth here.</p><button className="secondary-button" onClick={() => setActiveDialog('investments')}>Learn how it works</button></div>}</section>}
          <div className="welcome-row"><div><p className="eyebrow">WEDNESDAY, MAY 28, 2025</p><h1>Good morning, {accountName.split(' ')[0]} <span>👋</span></h1><p className="subhead">Here is your financial snapshot for this month.</p></div><div className="welcome-actions"><button className="secondary-button" onClick={() => setShowAddExpense(true)}><ArrowDownLeft size={16} /> Add income</button><button className="primary-button" onClick={() => setShowAddExpense(true)}><Plus size={17} /> Add expense</button>{transactions.length > 0 && <button className="clear-button" onClick={async () => { await api('/api/transactions', { method: 'DELETE' }); await loadAccountData() }}>Clear data</button>}</div></div>

          <section className="metrics-grid">
            <article className="metric-card balance-card"><div className="metric-head"><span>Total balance</span><button className="more-button" onClick={() => setActiveDialog('balance')}>•••</button></div><div className="balance-amount">{currency}{summary.balance.toLocaleString('en-IN')}<span>.00</span></div><div className="metric-foot"><span>{summary.balance ? 'Income minus expenses' : 'No data yet'}</span><span>Add income and expenses to calculate</span></div><div className="sparkline empty-sparkline" /></article>
            <article className="metric-card"><div className="metric-head"><span>Monthly income</span><span className="metric-icon income"><ArrowDownLeft size={16} /></span></div><div className="metric-amount">{currency}{summary.income.toLocaleString('en-IN')}</div><div className="metric-foot"><span>{summary.income ? 'Recorded income' : 'No income added'}</span></div><div className="mini-progress"><span style={{ width: summary.income ? '72%' : '0%' }} /></div><div className="budget-note">Use Add income to add salary or freelance money</div></article>
            <article className="metric-card"><div className="metric-head"><span>Monthly expenses</span><span className="metric-icon expense"><ArrowUpRight size={16} /></span></div><div className="metric-amount">{currency}{summary.expenses.toLocaleString('en-IN')}</div><div className="metric-foot"><span>{summary.expenses ? 'Recorded expenses' : 'No expenses added'}</span></div><div className="mini-progress expense-progress"><span style={{ width: summary.expenses ? '54%' : '0%' }} /></div><div className="budget-note">Your fresh start begins here</div></article>
            <article className="metric-card health-card"><div className="metric-head"><span>Financial health</span><CircleHelp size={16} /></div><div className="health-score"><strong>--</strong><span>/100</span><div className="health-ring"><div /></div></div><div className="health-label"><span className="status-dot" /> Waiting for data</div><div className="health-description">Add a few transactions for your score.</div></article>
          </section>

          <section className="dashboard-grid">
            <article className="panel spending-panel"><div className="panel-header"><div><h2>Spending overview</h2><p>Live data from your saved expenses.</p></div><button className="select-button" onClick={() => setActiveDialog('period')}>{period} <ChevronDown size={15} /></button></div><div className="chart-summary"><div><span>Total spent</span><strong>{currency}{summary.expenses.toLocaleString('en-IN')}</strong><small>{transactions.length ? 'Updated from your account' : 'No spending data yet'}</small></div><div className="legend"><span><i className="legend-dot purple-dot" /> Expenses</span><span><i className="legend-dot pale-dot" /> Budget</span></div></div><div className="bar-chart"><div className="grid-lines"><i /><i /><i /><i /></div><div className="bars">{chartValues.map((value, index) => <div className="bar-wrap" key={index}><div className="bar" style={{ height: `${Math.max(value / maxChartValue * 100, value ? 8 : 2)}%` }} /><span>{index === new Date().getMonth() ? 'Now' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}</span></div>)}</div></div></article>
            <article className="panel allocation-panel"><div className="panel-header"><div><h2>Budget allocation</h2><p>Live category breakdown.</p></div><button className="more-button" onClick={() => setActiveDialog('breakdown')}>•••</button></div>{Object.keys(expenseByCategory).length ? <div className="allocation-live-list">{Object.entries(expenseByCategory).slice(0, 5).map(([category, amount]) => <div key={category}><span>{category}</span><div className="mini-progress"><span style={{ width: `${amount / maxCategoryExpense * 100}%` }} /></div><strong>{currency}{amount.toLocaleString('en-IN')}</strong></div>)}</div> : <div className="empty-allocation"><LayoutGrid size={22} /><span>No category data yet.</span></div>}<button className="text-link" onClick={() => setActiveDialog('breakdown')}>View detailed breakdown <ChevronRight size={14} /></button></article>
          </section>

          <section className="lower-grid"><article className="panel goals-panel"><div className="panel-header"><div><h2>Goals in progress</h2><p>Small steps, big milestones.</p></div><button className="text-link" onClick={() => { setActiveNav('Goals'); setActiveDialog('goal') }}>View all <ChevronRight size={14} /></button></div><div className="empty-card-row"><Target size={20} /><span>{goals.length ? `${goals.length} goal${goals.length > 1 ? 's' : ''} in progress.` : 'No goals created yet.'}</span><button className="text-link" onClick={() => setActiveDialog('goal')}>Create goal</button></div></article><article className="panel activity-panel"><div className="panel-header"><div><h2>Recent activity</h2><p>Your latest transactions.</p></div><button className="text-link" onClick={() => setActiveNav('Transactions')}>View all <ChevronRight size={14} /></button></div>{transactions.length === 0 ? <div className="empty-card-row"><ReceiptText size={20} /><span>No transactions yet.</span><button className="text-link" onClick={() => setShowAddExpense(true)}>Add expense</button></div> : <div className="transaction-list">{transactions.slice(0, 4).map((transaction) => <div className="transaction" key={`${transaction.name}-${transaction.date}`}><div className={`transaction-icon ${transaction.tone}`}>{transaction.icon}</div><div className="transaction-info"><strong>{transaction.name}</strong><span>{transaction.category} · {transaction.date}</span></div><strong>{transaction.amount}</strong></div>)}</div>}</article></section>

          <section className="insight-banner"><div className="insight-icon"><Sparkles size={20} /></div><div><span className="eyebrow">YOUR AI MONEY MOMENT</span><h2>Your advisor is ready when you are.</h2><p>Add a few transactions and get personalized recommendations.</p></div><button onClick={() => setShowAssistant(true)}>Ask your AI advisor <ChevronRight size={15} /></button></section>
          <footer><span><ShieldCheck size={14} /> Your data is encrypted and private</span><span>Last synced just now <span className="sync-dot" /></span><button><Download size={14} /> Export report</button></footer>
        </div>
      </main>

      {activeDialog && activeDialog !== 'currency' && <div className="modal-backdrop" onClick={closeDialog}><div className="modal action-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">POCKETWISE</span><h2>{activeDialog === 'profile' ? 'Profile details' : activeDialog === 'security' ? 'Security & privacy' : activeDialog === 'period' ? 'Choose a period' : activeDialog === 'breakdown' ? 'Detailed breakdown' : activeDialog === 'goal' ? 'Create a goal' : activeDialog === 'budget' ? 'Create a budget' : activeDialog === 'investments' ? 'Investments' : 'Account balance'}</h2></div><button className="icon-button" onClick={closeDialog} aria-label="Close dialog"><X size={19} /></button></div>{activeDialog === 'profile' && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setAccountName(form.get('name')); setAccountEmail(form.get('email')); closeDialog() }}><label>Name<input name="name" defaultValue={accountName} required /></label><label>Email<input name="email" type="email" defaultValue={accountEmail} required /></label><button className="primary-button modal-submit"><Check size={16} /> Save profile</button></form>}{activeDialog === 'security' && <div className="action-content"><div className="security-row"><LockKeyhole size={18} /><span><strong>Password</strong><small>Last updated recently</small></span><button className="text-link">Change</button></div><div className="security-row"><ShieldCheck size={18} /><span><strong>Two-factor authentication</strong><small>Add another layer of protection</small></span><button className="secondary-button">Enable</button></div><p className="muted-note">Your local dashboard session is protected. Connect a backend to enable production authentication.</p></div>}{activeDialog === 'period' && <div className="choice-list">{['This month', 'Last month', 'This year'].map((option) => <button key={option} onClick={() => { setPeriod(option); closeDialog() }}>{option}{period === option && <Check size={15} />}</button>)}</div>}{activeDialog === 'breakdown' && <div className="empty-section compact"><LayoutGrid size={25} /><h2>No breakdown yet</h2><p>Add transactions with categories to see your allocation.</p><button className="primary-button" onClick={() => { closeDialog(); setShowAddExpense(true) }}><Plus size={16} /> Add expense</button></div>}{activeDialog === 'goal' && <form onSubmit={(event) => { event.preventDefault(); closeDialog(); setActiveNav('Goals') }}><label>Goal name<input name="goal" placeholder="e.g. Emergency fund" required /></label><label>Target amount<input type="number" min="1" placeholder="0" required /></label><button className="primary-button modal-submit"><Target size={16} /> Save goal</button></form>}{activeDialog === 'budget' && <form onSubmit={(event) => { event.preventDefault(); closeDialog(); setActiveNav('Budgets') }}><label>Category<input name="category" placeholder="e.g. Food" required /></label><label>Monthly limit<input type="number" min="1" placeholder="0" required /></label><button className="primary-button modal-submit"><LayoutGrid size={16} /> Save budget</button></form>}{activeDialog === 'investments' && <div className="action-content"><div className="empty-section compact"><TrendingUp size={25} /><h2>Build your portfolio</h2><p>Investment tracking will appear here after you connect an account or add a holding.</p><button className="primary-button" onClick={closeDialog}>Got it</button></div></div>}{activeDialog === 'balance' && <div className="action-content"><p className="muted-note">Your balance will be calculated automatically after you add income and expense entries.</p><button className="primary-button settings-done" onClick={closeDialog}>Close</button></div>}</div></div>}

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="modal settings-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">PREFERENCES</span><h2>Settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={19} /></button></div><div className="settings-section"><span className="settings-label">Account</span><button className="settings-row" onClick={() => { setShowSettings(false); setActiveDialog('profile') }}><span><strong>Profile & security</strong><small>Manage your personal details and password</small></span><ChevronRight size={16} /></button><button className="settings-row" onClick={() => { setShowSettings(false); setActiveDialog('currency') }}><span><strong>Currency</strong><small>{currency === '₹' ? 'Indian Rupee (₹)' : 'US Dollar ($)'}</small></span><ChevronDown size={16} /></button></div><div className="settings-section"><span className="settings-label">Preferences</span><label className="toggle-row"><span><strong>Email alerts</strong><small>Receive weekly spending summaries</small></span><input type="checkbox" checked={emailAlerts} onChange={(event) => setEmailAlerts(event.target.checked)} /><i /></label><label className="toggle-row"><span><strong>Auto-categorize expenses</strong><small>Let AI organize new transactions</small></span><input type="checkbox" checked={autoCategorize} onChange={(event) => setAutoCategorize(event.target.checked)} /><i /></label></div><button className="primary-button settings-done" onClick={() => setShowSettings(false)}>Done</button></div></div>}

      {activeDialog === 'currency' && <div className="modal-backdrop" onClick={closeDialog}><div className="modal action-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">PREFERENCES</span><h2>Currency</h2></div><button className="icon-button" onClick={closeDialog} aria-label="Close currency"><X size={19} /></button></div><div className="choice-list">{[['₹', 'Indian Rupee'], ['$', 'US Dollar'], ['€', 'Euro']].map(([symbol, label]) => <button key={symbol} onClick={() => { setCurrency(symbol); closeDialog() }}><span>{symbol} {label}</span>{currency === symbol && <Check size={15} />}</button>)}</div></div></div>}

      {showAddExpense && <div className="modal-backdrop" onClick={() => setShowAddExpense(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">QUICK ENTRY</span><h2>Add money movement</h2></div><button className="icon-button" onClick={() => setShowAddExpense(false)} aria-label="Close"><X size={19} /></button></div><form onSubmit={handleAddExpense}><label>Type<select name="type" defaultValue="expense"><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Description<input name="description" placeholder="e.g. Salary or groceries" required /></label><div className="form-row"><label>Amount<input name="amount" type="number" min="1" placeholder="0" required /></label><label>Category<select name="category" defaultValue="Food & Dining"><option>Food & Dining</option><option>Salary</option><option>Freelancing</option><option>Transport</option><option>Entertainment</option><option>Shopping</option><option>Other</option></select></label></div><button className="primary-button modal-submit"><Plus size={17} /> Save entry</button></form></div></div>}

      {showAssistant && <div className="assistant-drawer"><div className="assistant-header"><div><div className="assistant-title"><span className="assistant-avatar"><Bot size={18} /></span><strong>AI Advisor</strong><span className="online-badge">Online</span></div><span className="assistant-subtitle">Your personal finance co-pilot</span></div><button className="icon-button" onClick={() => setShowAssistant(false)} aria-label="Close assistant"><X size={18} /></button></div><div className="assistant-messages">{messages.map((message, index) => <div className={`message ${message.from}`} key={index}>{message.from === 'ai' && <span className="message-avatar"><Sparkles size={12} /></span>}<p>{message.text}</p></div>)}</div><form className="assistant-form" onSubmit={sendMessage}><input value={assistantText} onChange={(event) => setAssistantText(event.target.value)} placeholder="Ask about your finances..." /><button type="submit" aria-label="Send message"><ArrowUpRight size={17} /></button></form></div>}
    </div>
  )
}

export default App
