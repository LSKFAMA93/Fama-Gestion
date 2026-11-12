import { useEffect, useMemo, useState } from 'react'
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import './App.css'

ChartJS.register(ArcElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)

const STORAGE_KEY = 'fama-gestion-data-v2'
const LEGACY_STORAGE_KEY = 'fama-gestion-data-v1'
const XOF_PER_EUR = 655.957
const categories = ['Salaire', 'Logement', 'Courses', 'Transport', 'Factures', 'Loisirs', 'Santé', 'Épargne', 'Crédits', 'Autre']
const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const currency = { format: (amount) => `${numberFormat.format(amount)} FCFA` }

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

function addMonthToDate(value) {
  const date = new Date(`${value}T12:00:00`)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + 1)
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

function toXof(euros) {
  return Math.round(euros * XOF_PER_EUR)
}

function dateInMonthOffset(monthOffset, requestedDay) {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() + monthOffset)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const day = Math.min(requestedDay, lastDay, monthOffset === 0 ? new Date().getDate() : lastDay)
  return `${monthKey(date)}-${String(day).padStart(2, '0')}`
}

function makeInitialData() {
  const transactions = Array.from({ length: 6 }, (_, index) => {
    const monthOffset = index - 5
    return [
      { id: `sample-${index}-salary`, label: 'Salaire mensuel', category: 'Salaire', type: 'income', amount: toXof(2850), date: dateInMonthOffset(monthOffset, 2) },
      { id: `sample-${index}-rent`, label: 'Loyer appartement', category: 'Logement', type: 'expense', amount: toXof(890), date: dateInMonthOffset(monthOffset, 3) },
      { id: `sample-${index}-food`, label: 'Courses du mois', category: 'Courses', type: 'expense', amount: toXof(126 + index * 4), date: dateInMonthOffset(monthOffset, 5) },
      { id: `sample-${index}-transport`, label: 'Abonnement transport', category: 'Transport', type: 'expense', amount: toXof(76), date: dateInMonthOffset(monthOffset, 6) },
      { id: `sample-${index}-saving`, label: 'Épargne automatique', category: 'Épargne', type: 'savings', amount: toXof(250), date: dateInMonthOffset(monthOffset, 7) },
      { id: `sample-${index}-bills`, label: 'Facture énergie', category: 'Factures', type: 'expense', amount: toXof(94 + index * 2), date: dateInMonthOffset(monthOffset, 8) },
      { id: `sample-${index}-leisure`, label: 'Restaurant', category: 'Loisirs', type: 'expense', amount: toXof(42), date: dateInMonthOffset(monthOffset, 10) },
      { id: `sample-${index}-bonus`, label: index === 5 ? 'Prime exceptionnelle' : 'Remboursement mutuelle', category: index === 5 ? 'Salaire' : 'Autre', type: 'income', amount: toXof(index === 5 ? 300 : 45), date: dateInMonthOffset(monthOffset, 12) },
    ]
  }).flat()

  return {
    transactions,
    goals: [
      { id: 'g1', name: 'Voyage au Japon', target: toXof(4500), saved: toXof(2150), monthly: toXof(250), dueDate: dateOffset(240) },
      { id: 'g2', name: 'Apport immobilier', target: toXof(25000), saved: toXof(7800), monthly: toXof(400), dueDate: dateOffset(900) },
    ],
    loans: [],
  }
}

function loadData() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.transactions) && Array.isArray(parsed.goals)) return { ...parsed, loans: Array.isArray(parsed.loans) ? parsed.loans : [] }
    }
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed.transactions) && Array.isArray(parsed.goals)) {
        const convert = (amount) => Math.round(Number(amount) * XOF_PER_EUR)
        const migrated = {
          transactions: parsed.transactions.map((item) => ({ ...item, amount: convert(item.amount) })),
          goals: parsed.goals.map((goal) => ({ ...goal, target: convert(goal.target), saved: convert(goal.saved), monthly: convert(goal.monthly) })),
          loans: [],
        }
        window.localStorage.removeItem(LEGACY_STORAGE_KEY)
        return migrated
      }
    }
  } catch {
    // Continue with the local sample data when storage is unavailable or invalid.
  }
  return makeInitialData()
}

function formatMonth(value) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${value}-02T12:00:00`))
}

function formatMonthOffset(months) {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  return formatMonth(monthKey(date))
}

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

function App() {
  const [data, setData] = useState(loadData)
  const [page, setPage] = useState('dashboard')
  const [month, setMonth] = useState(monthKey())
  const [theme, setTheme] = useState('light')
  const [transactionModal, setTransactionModal] = useState(null)
  const [goalModal, setGoalModal] = useState(false)
  const [fundGoal, setFundGoal] = useState(null)
  const [loanModal, setLoanModal] = useState(false)
  const [repaymentLoan, setRepaymentLoan] = useState(null)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installHelp, setInstallHelp] = useState(false)
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('month')
  const [query, setQuery] = useState('')

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // The app remains usable for this session if storage is blocked.
    }
  }, [data])

  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {})
    }
    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const monthTransactions = useMemo(
    () => data.transactions.filter((item) => item.date.startsWith(month)),
    [data.transactions, month],
  )
  const totals = useMemo(() => monthTransactions.reduce((result, item) => {
    if (item.type === 'income') result.income += item.amount
    else if (item.type === 'savings') result.savings += item.amount
    else result.expenses += item.amount
    return result
  }, { income: 0, expenses: 0, savings: 0 }), [monthTransactions])
  const balance = data.transactions.reduce((total, item) => total + (item.type === 'income' ? item.amount : -item.amount), 0)
  const filteredTransactions = data.transactions
    .filter((item) => item.date.startsWith(filterPeriod === 'year' ? month.slice(0, 4) : month))
    .filter((item) => filterType === 'all' || item.type === filterType)
    .filter((item) => filterCategory === 'all' || item.category === filterCategory)
    .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))

  function saveTransaction(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const transaction = {
      id: transactionModal?.id ?? crypto.randomUUID(),
      label: formData.get('label').trim(),
      category: formData.get('category'),
      type: formData.get('type'),
      amount: Number(formData.get('amount')),
      date: formData.get('date'),
    }
    setData((current) => ({
      ...current,
      transactions: transactionModal?.id
        ? current.transactions.map((item) => item.id === transaction.id ? transaction : item)
        : [transaction, ...current.transactions],
    }))
    setTransactionModal(null)
  }

  function saveGoal(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const target = Number(formData.get('target'))
    setData((current) => ({
      ...current,
      goals: [...current.goals, {
        id: crypto.randomUUID(), name: formData.get('name').trim(), target,
        saved: Number(formData.get('saved')) || 0, monthly: Number(formData.get('monthly')) || 0,
        dueDate: formData.get('dueDate'),
      }],
    }))
    setGoalModal(false)
  }

  function saveLoan(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const principal = Number(formData.get('principal'))
    const loan = {
      id: crypto.randomUUID(),
      lender: formData.get('lender').trim(),
      purpose: formData.get('purpose').trim(),
      principal,
      remaining: formData.get('remaining') === '' ? principal : Math.min(principal, Math.max(0, Number(formData.get('remaining')))),
      monthlyPayment: Number(formData.get('monthlyPayment')),
      nextPaymentDate: formData.get('nextPaymentDate'),
      dueDate: formData.get('dueDate'),
    }
    setData((current) => ({
      ...current,
      loans: [loan, ...current.loans],
      transactions: [{
        id: crypto.randomUUID(), label: `Emprunt reçu · ${loan.lender}`, category: 'Crédits',
        type: 'income', amount: loan.principal, date: dateOffset(0),
      }, ...current.transactions],
    }))
    setLoanModal(false)
  }

  function saveLoanRepayment(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const amount = Number(formData.get('amount'))
    if (!Number.isFinite(amount) || amount <= 0) return
    setData((current) => {
      const loan = current.loans.find((item) => item.id === repaymentLoan)
      const payment = Math.min(amount, loan?.remaining ?? 0)
      if (!loan || payment === 0) return current
      return {
        ...current,
        loans: current.loans.map((item) => item.id === repaymentLoan
          ? { ...item, remaining: item.remaining - payment, nextPaymentDate: addMonthToDate(item.nextPaymentDate) }
          : item),
        transactions: [{
          id: crypto.randomUUID(), label: `Remboursement · ${loan.lender}`, category: 'Crédits',
          type: 'expense', amount: payment, date: formData.get('date'),
        }, ...current.transactions],
      }
    })
    setRepaymentLoan(null)
  }

  function addToGoal(goalId) {
    setFundGoal(goalId)
  }

  function saveContribution(event) {
    event.preventDefault()
    const amount = Number(new FormData(event.currentTarget).get('amount'))
    if (!Number.isFinite(amount) || amount <= 0) return
    setData((current) => {
      const goal = current.goals.find((item) => item.id === fundGoal)
      const contribution = Math.min(amount, Math.max(0, (goal?.target ?? 0) - (goal?.saved ?? 0)))
      if (!goal || contribution === 0) return current
      return {
        ...current,
        goals: current.goals.map((item) => item.id === fundGoal ? { ...item, saved: item.saved + contribution } : item),
        transactions: [...current.transactions, {
        id: crypto.randomUUID(),
        label: `Versement · ${goal.name}`,
        category: 'Épargne',
        type: 'savings',
        amount: contribution,
        date: dateOffset(0),
      }],
      }
    })
    setFundGoal(null)
  }

  function deleteTransaction(id) {
    setData((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }))
  }

  function openTransaction(item = null) {
    setTransactionModal(item ?? { type: 'expense', date: new Date().toISOString().slice(0, 10) })
  }

  async function installApp() {
    if (!installPrompt) {
      setInstallHelp(true)
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    if (choice.outcome === 'accepted') setIsInstalled(true)
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <a className="brand" href="#dashboard" onClick={() => setPage('dashboard')}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>fama<span className="brand-light">.</span></span>
        </a>
        <div className="side-label">ESPACE PERSONNEL</div>
        <nav className="side-nav" aria-label="Navigation principale">
          <button className={page === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('dashboard')}><span className="nav-icon">◫</span>Vue d’ensemble</button>
          <button className={page === 'transactions' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('transactions')}><span className="nav-icon">↔</span>Transactions</button>
          <button className={page === 'projects' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('projects')}><span className="nav-icon">◎</span>Mes projets</button>
          <button className={page === 'loans' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('loans')}><span className="nav-icon">↻</span>Mes emprunts</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><span className="privacy-dot" />Données enregistrées<br />sur cet appareil</div>
          <button className="profile" type="button" aria-label="Mon profil personnel">
            <span className="avatar">MP</span><span className="profile-text"><strong>Mon espace</strong><small>Budget personnel</small></span><span className="profile-menu">···</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Mon espace <span>/</span> <strong>{page === 'dashboard' ? 'Vue d’ensemble' : page === 'transactions' ? 'Transactions' : page === 'projects' ? 'Mes projets' : 'Mes emprunts'}</strong></div>
          <div className="topbar-actions">
            <label className="month-picker"><span className="sr-only">Mois affiché</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><span className="month-label">{formatMonth(month)}</span></label>
            {!isInstalled && <button className="install-button" type="button" onClick={installApp} title="Installer Fama-Gestion" aria-label="Installer Fama-Gestion"><span aria-hidden="true">↓</span><span className="install-label">Installer</span></button>}
            <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'} title="Changer de thème">◐</button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="page-heading">
            <div><p className="eyebrow">{page === 'loans' ? 'SUIVI PERSONNEL DES DETTES' : 'VOTRE SANTÉ FINANCIÈRE'}</p><h1>{page === 'dashboard' ? 'Mon budget' : page === 'transactions' ? 'Mes transactions' : page === 'projects' ? 'Mes projets' : 'Mes emprunts'}</h1><p className="heading-subtitle">{page === 'dashboard' ? 'Voici où vous en êtes pour ' : page === 'transactions' ? 'Retrouvez et gérez tous vos mouvements.' : page === 'projects' ? 'Chaque petit pas vous rapproche de vos envies.' : 'Les montants restants et les prochaines échéances.'}{page === 'dashboard' && <span className="capitalize">{formatMonth(month)}</span>}</p></div>
            {page === 'loans' ? <button className="primary-button" onClick={() => setLoanModal(true)}><span>＋</span> Déclarer un emprunt</button> : <button className="primary-button" onClick={() => openTransaction()}><span>＋</span> Nouvelle transaction</button>}
          </section>

          {(page === 'dashboard' || page === 'transactions') && <section className="kpi-grid" aria-label="Indicateurs clés">
            <article className="kpi-card balance-card"><div className="kpi-top"><span>Solde net suivi</span><span className="kpi-symbol">↗</span></div><strong className="kpi-value">{currency.format(balance)}</strong><div className="kpi-foot"><span className="status-dot" />Revenus moins dépenses et épargne</div></article>
            <article className="kpi-card"><div className="kpi-top"><span>Revenus du mois</span><span className="kpi-symbol income-symbol">↙</span></div><strong className="kpi-value">{currency.format(totals.income)}</strong><div className="kpi-foot">Entrées d’argent</div></article>
            <article className="kpi-card"><div className="kpi-top"><span>Dépenses du mois</span><span className="kpi-symbol expense-symbol">↗</span></div><strong className="kpi-value">{currency.format(totals.expenses)}</strong><div className="kpi-foot">Hors épargne</div></article>
            <article className="kpi-card savings-card"><div className="kpi-top"><span>Épargne ce mois</span><span className="kpi-symbol savings-symbol">✳</span></div><strong className="kpi-value">{currency.format(totals.savings)}</strong><div className="kpi-foot">{totals.income ? `${Math.round(totals.savings / totals.income * 100)} % de vos revenus` : 'Aucun revenu ce mois'}</div></article>
          </section>}

          {page === 'dashboard' && <>
            <section className="chart-grid">
              <article className="panel trend-panel"><div className="panel-heading"><div><h2>Évolution du solde</h2><p>Vos revenus et dépenses, mois par mois</p></div><span className="legend"><i /> Solde net</span></div><BalanceChart transactions={data.transactions} dark={theme === 'dark'} /></article>
              <article className="panel category-panel"><div className="panel-heading"><div><h2>Répartition des dépenses</h2><p>Par catégorie · {formatMonth(month)}</p></div></div><CategoryChart transactions={monthTransactions} dark={theme === 'dark'} /><div className="category-legend"><CategoryLegend transactions={monthTransactions} /></div></article>
            </section>
            <section className="lower-grid">
              <article className="panel recent-panel"><div className="panel-heading"><div><h2>Activité récente</h2><p>Vos derniers mouvements</p></div><button className="text-button" onClick={() => setPage('transactions')}>Tout voir <span>→</span></button></div><TransactionTable items={filteredTransactions.slice(0, 5)} onEdit={openTransaction} onDelete={deleteTransaction} /></article>
              <article className="panel goals-panel"><div className="panel-heading"><div><h2>Projets en cours</h2><p>Les objectifs qui vous tiennent à cœur</p></div><button className="icon-button" onClick={() => setGoalModal(true)} aria-label="Ajouter un objectif" title="Ajouter un objectif">＋</button></div><GoalList goals={data.goals.slice(0, 2)} onAdd={addToGoal} /></article>
            </section>
          </>}

          {page === 'transactions' && <section className="panel transactions-panel"><div className="panel-heading transaction-tools"><div><h2>Historique</h2><p>{filteredTransactions.length} mouvement{filteredTransactions.length > 1 ? 's' : ''} en {filterPeriod === 'year' ? month.slice(0, 4) : formatMonth(month)}</p></div><div className="filters"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" /></label><select aria-label="Filtrer par période" value={filterPeriod} onChange={(event) => setFilterPeriod(event.target.value)}><option value="month">Ce mois</option><option value="year">Cette année</option></select><select aria-label="Filtrer par type" value={filterType} onChange={(event) => setFilterType(event.target.value)}><option value="all">Tous les types</option><option value="income">Revenus</option><option value="expense">Dépenses</option><option value="savings">Épargne</option></select><select aria-label="Filtrer par catégorie" value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}><option value="all">Toutes catégories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div></div><TransactionTable items={filteredTransactions} onEdit={openTransaction} onDelete={deleteTransaction} /></section>}

          {page === 'projects' && <section className="projects-section"><div className="projects-intro"><span className="project-sparkle">✳</span><div><h2>Construisez la suite</h2><p>Un objectif à la fois, à votre rythme.</p></div><button className="secondary-button" onClick={() => setGoalModal(true)}>＋ Ajouter un projet</button></div><GoalList goals={data.goals} onAdd={addToGoal} expanded /></section>}
          {page === 'loans' && <LoansView loans={data.loans ?? []} onAdd={() => setLoanModal(true)} onRepay={(id) => setRepaymentLoan(id)} />}
          <footer className="page-footer"><span>Fama-Gestion</span><span>Vos finances, en toute simplicité.</span><span>100 % privé · Stocké sur votre appareil</span></footer>
        </div>
      </main>

      {transactionModal && <Modal title={transactionModal.id ? 'Modifier la transaction' : 'Nouvelle transaction'} onClose={() => setTransactionModal(null)}><form className="modal-form" onSubmit={saveTransaction}>
        <label>Libellé<input name="label" required maxLength="70" placeholder="Ex. Courses du mois" defaultValue={transactionModal.label ?? ''} autoFocus /></label>
        <div className="form-row"><label>Type<select name="type" defaultValue={transactionModal.type}><option value="expense">Dépense</option><option value="income">Revenu</option><option value="savings">Épargne</option></select></label><label>Catégorie<select name="category" defaultValue={transactionModal.category ?? 'Autre'}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div>
        <div className="form-row"><label>Montant (FCFA)<input name="amount" type="number" min="1" step="1" required defaultValue={transactionModal.amount ?? ''} placeholder="25 000" /></label><label>Date<input name="date" type="date" required defaultValue={transactionModal.date} /></label></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setTransactionModal(null)}>Annuler</button><button className="primary-button" type="submit">{transactionModal.id ? 'Enregistrer' : 'Ajouter'}</button></div>
      </form></Modal>}

      {goalModal && <Modal title="Créer un projet" onClose={() => setGoalModal(false)}><form className="modal-form" onSubmit={saveGoal}>
        <label>Nom du projet<input name="name" required maxLength="60" placeholder="Ex. Week-end à Lisbonne" autoFocus /></label>
        <div className="form-row"><label>Montant cible (FCFA)<input name="target" type="number" min="1" step="1" required placeholder="500 000" /></label><label>Déjà épargné (FCFA)<input name="saved" type="number" min="0" step="1" defaultValue="0" /></label></div>
        <div className="form-row"><label>Versement mensuel (FCFA)<input name="monthly" type="number" min="0" step="1" required placeholder="20 000" /></label><label>Échéance souhaitée<input name="dueDate" type="date" required /></label></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setGoalModal(false)}>Annuler</button><button className="primary-button" type="submit">Créer le projet</button></div>
      </form></Modal>}

      {loanModal && <Modal title="Déclarer un emprunt" onClose={() => setLoanModal(false)}><form className="modal-form" onSubmit={saveLoan}>
        <label>Créancier<input name="lender" required maxLength="70" placeholder="Ex. Banque, proche" autoFocus /></label>
        <label>Objet de l’emprunt<input name="purpose" required maxLength="70" placeholder="Ex. Travaux, équipement" /></label>
        <div className="form-row"><label>Montant emprunté (FCFA)<input name="principal" type="number" min="1" step="1" required placeholder="500 000" /></label><label>Capital restant dû (FCFA)<input name="remaining" type="number" min="0" step="1" placeholder="Laisser vide si identique" /></label></div>
        <label>Mensualité prévue (FCFA)<input name="monthlyPayment" type="number" min="1" step="1" required placeholder="50 000" /></label>
        <div className="form-row"><label>Prochaine échéance<input name="nextPaymentDate" type="date" required defaultValue={dateOffset(30)} /></label><label>Échéance finale prévue<input name="dueDate" type="date" required defaultValue={dateOffset(365)} /></label></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setLoanModal(false)}>Annuler</button><button className="primary-button" type="submit">Enregistrer l’emprunt</button></div>
      </form></Modal>}

      {repaymentLoan && <Modal title="Enregistrer un remboursement" onClose={() => setRepaymentLoan(null)}><form className="modal-form" onSubmit={saveLoanRepayment}>
        <p className="loan-payment-context">Capital restant : <strong>{currency.format(data.loans.find((loan) => loan.id === repaymentLoan)?.remaining ?? 0)}</strong></p>
        <label>Montant remboursé (FCFA)<input name="amount" type="number" min="1" step="1" max={data.loans.find((loan) => loan.id === repaymentLoan)?.remaining} required placeholder="50 000" autoFocus /></label>
        <label>Date du remboursement<input name="date" type="date" required defaultValue={dateOffset(0)} /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setRepaymentLoan(null)}>Annuler</button><button className="primary-button" type="submit">Confirmer le remboursement</button></div>
      </form></Modal>}

      {fundGoal && <Modal title={`Ajouter un fonds · ${data.goals.find((goal) => goal.id === fundGoal)?.name ?? ''}`} onClose={() => setFundGoal(null)}><form className="modal-form" onSubmit={saveContribution}>
        <label>Montant à ajouter (FCFA)<input name="amount" type="number" min="1" step="1" required placeholder="25 000" autoFocus /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFundGoal(null)}>Annuler</button><button className="primary-button" type="submit">Ajouter au projet</button></div>
      </form></Modal>}

      {installHelp && <Modal title="Installer Fama-Gestion" onClose={() => setInstallHelp(false)}><div className="install-guide">
        <section><h3>Android</h3><p>Ouvrez le menu de votre navigateur, puis choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p></section>
        <section><h3>iPhone ou iPad</h3><p>Ouvrez cette page dans Safari, touchez « Partager », puis « Sur l’écran d’accueil ».</p></section>
        <p className="install-privacy">Vos données de budget restent enregistrées sur cet appareil.</p>
      </div></Modal>}
    </div>
  )
}

function TransactionTable({ items, onEdit, onDelete }) {
  if (!items.length) return <div className="empty-state"><span>↔</span><strong>Aucune transaction pour cette période</strong><p>Ajoutez un mouvement ou choisissez un autre mois.</p></div>
  return <div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>CATÉGORIE</th><th>DATE</th><th className="amount-heading">MONTANT</th><th aria-label="Actions" /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><span className={`transaction-type-icon ${item.type}`}>{item.type === 'income' ? '↙' : item.type === 'savings' ? '✳' : '↗'}</span><strong className="transaction-name">{item.label}</strong></td><td><span className={`category-tag ${item.category.toLowerCase().replaceAll('é', 'e')}`}>{item.category}</span></td><td className="date-cell">{formatDate(item.date)}</td><td className={`amount-cell ${item.type}`}>{item.type === 'income' ? '+' : '−'}{currency.format(item.amount)}</td><td><div className="row-actions"><button title="Modifier" aria-label={`Modifier ${item.label}`} onClick={() => onEdit(item)}>↗</button><button title="Supprimer" aria-label={`Supprimer ${item.label}`} onClick={() => onDelete(item.id)}>×</button></div></td></tr>)}</tbody></table></div>
}

function LoansView({ loans, onAdd, onRepay }) {
  const activeLoans = loans.filter((loan) => loan.remaining > 0)
  const totalBorrowed = loans.reduce((total, loan) => total + loan.principal, 0)
  const totalRemaining = activeLoans.reduce((total, loan) => total + loan.remaining, 0)
  const monthlyTotal = activeLoans.reduce((total, loan) => total + loan.monthlyPayment, 0)
  const nextDeadline = activeLoans.toSorted((a, b) => a.nextPaymentDate.localeCompare(b.nextPaymentDate))[0]

  return <section className="loans-section">
    <div className="loan-summary-grid">
      <article className="loan-summary-card"><span>Capital emprunté</span><strong>{currency.format(totalBorrowed)}</strong><small>{loans.length} emprunt{loans.length > 1 ? 's' : ''} déclaré{loans.length > 1 ? 's' : ''}</small></article>
      <article className="loan-summary-card remaining"><span>Reste à rembourser</span><strong>{currency.format(totalRemaining)}</strong><small>{activeLoans.length} crédit{activeLoans.length > 1 ? 's' : ''} en cours</small></article>
      <article className="loan-summary-card"><span>Mensualités prévues</span><strong>{currency.format(monthlyTotal)}</strong><small>Total mensuel des crédits actifs</small></article>
      <article className="loan-summary-card deadline"><span>Prochaine échéance</span><strong>{nextDeadline ? formatDate(nextDeadline.nextPaymentDate) : 'Aucune'}</strong><small>{nextDeadline ? nextDeadline.lender : 'Ajoutez un emprunt pour commencer'}</small></article>
    </div>
    <div className="loan-section-heading"><div><h2>Mes crédits personnels</h2><p>Les remboursements sont ajoutés à vos transactions.</p></div><button className="secondary-button" onClick={onAdd}>＋ Déclarer un emprunt</button></div>
    {loans.length ? <div className="loan-list">{loans.map((loan) => {
      const progress = loan.principal > 0 ? Math.min(100, Math.round((loan.principal - loan.remaining) / loan.principal * 100)) : 0
      return <article className="loan-card" key={loan.id}>
        <div className="loan-card-top"><span className="loan-icon">↻</span><div className="loan-name"><strong>{loan.lender}</strong><small>{loan.purpose}</small></div><span className={loan.remaining > 0 ? 'loan-status active' : 'loan-status paid'}>{loan.remaining > 0 ? 'En cours' : 'Remboursé'}</span></div>
        <div className="loan-balance"><div><span>Capital restant dû</span><strong>{currency.format(loan.remaining)}</strong></div><div><span>Montant initial</span><strong>{currency.format(loan.principal)}</strong></div></div>
        <div className="progress-track loan-progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="loan-card-meta"><span>{progress} % remboursé</span><span>{currency.format(loan.monthlyPayment)} / mois</span></div>
        <div className="loan-dates"><span>Prochaine échéance <strong>{loan.remaining > 0 ? formatDate(loan.nextPaymentDate) : 'Terminée'}</strong></span><span>Fin prévue <strong>{formatDate(loan.dueDate)}</strong></span></div>
        {loan.remaining > 0 && <button className="loan-pay-button" onClick={() => onRepay(loan.id)}>＋ Enregistrer un remboursement</button>}
      </article>
    })}</div> : <div className="panel loan-empty"><span className="loan-icon">↻</span><strong>Aucun emprunt déclaré</strong><p>Ajoutez vos crédits personnels pour suivre les sommes restantes et les dates de remboursement.</p><button className="primary-button" onClick={onAdd}>＋ Déclarer un emprunt</button></div>}
    <p className="loans-disclaimer">Suivi personnel uniquement. Les montants et échéances sont renseignés par vos soins ; vérifiez-les auprès de votre créancier.</p>
  </section>
}

function GoalList({ goals, onAdd, expanded = false }) {
  if (!goals.length) return <div className="empty-state"><span>◎</span><strong>Aucun projet pour le moment</strong><p>Créez un objectif pour commencer à planifier.</p></div>
  return <div className={expanded ? 'goal-list expanded' : 'goal-list'}>{goals.map((goal, index) => {
    const progress = Math.min(100, Math.round(goal.saved / goal.target * 100))
    const remaining = Math.max(0, goal.target - goal.saved)
    const monthsLeft = goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : null
    return <article className={`goal-item goal-${index % 2}`} key={goal.id}><div className="goal-top"><span className="goal-icon">{index % 2 ? '⌂' : '✳'}</span><div className="goal-title"><strong>{goal.name}</strong><small>Date souhaitée · {formatDate(goal.dueDate)}</small></div><button className="icon-button add-fund" onClick={() => onAdd(goal.id)} title="Ajouter un fonds" aria-label={`Ajouter un fonds pour ${goal.name}`}>＋</button></div><div className="goal-amounts"><strong>{currency.format(goal.saved)} <small>épargnés</small></strong><span>sur {currency.format(goal.target)}{goal.monthly > 0 && ` · ${currency.format(goal.monthly)}/mois`}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="goal-bottom"><span>{progress} % atteint</span><span>{remaining === 0 ? 'Objectif atteint' : monthsLeft ? `Atteinte estimée · ${formatMonthOffset(monthsLeft)}` : 'Définissez un versement mensuel'}</span></div></article>
  })}</div>
}

function getExpenseGroups(transactions) {
  const grouped = transactions.filter((item) => item.type === 'expense').reduce((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + item.amount
    return result
  }, {})
  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1])
  if (sorted.length <= 5) return sorted
  const visible = sorted.slice(0, 4)
  const otherAmount = sorted.slice(4).reduce((total, [, amount]) => total + amount, 0)
  return [...visible, ['Autres', otherAmount]]
}

function CategoryChart({ transactions, dark }) {
  const entries = getExpenseGroups(transactions)
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0)
  const colors = ['#8057e8', '#e3b857', '#56a98a', '#ec806b', '#64a2b8']
  const data = {
    labels: entries.length ? entries.map(([category]) => category) : ['Aucune dépense'],
    datasets: [{ data: entries.length ? entries.map(([, amount]) => amount) : [1], backgroundColor: entries.length ? colors.slice(0, entries.length) : [dark ? '#34333a' : '#ecebf0'], borderWidth: 0, hoverOffset: 3 }],
  }
  const options = {
    responsive: false,
    maintainAspectRatio: false,
    cutout: '78%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: entries.length > 0, callbacks: { label: (context) => ` ${context.label} : ${currency.format(context.raw)}` } },
    },
  }
  return <div className="donut-wrap"><Doughnut className="donut" width={142} height={142} data={data} options={options} aria-label={`Répartition de ${currency.format(total)} de dépenses par catégorie`} role="img" /><div className="donut-center"><strong>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(total)}</strong><span>CE MOIS</span></div></div>
}

function CategoryLegend({ transactions }) {
  const colors = ['#8057e8', '#e3b857', '#56a98a', '#ec806b', '#64a2b8']
  const entries = getExpenseGroups(transactions)
  if (!entries.length) return <p className="legend-empty">Vos dépenses apparaîtront ici.</p>
  return entries.map(([category, amount], index) => <div className="legend-row" key={category}><span><i style={{ backgroundColor: colors[index] }} />{category}</span><strong>{currency.format(amount)}</strong></div>)
}

function BalanceChart({ transactions, dark }) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - 5 + index)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const value = transactions.filter((item) => item.date.slice(0, 7) <= key).reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0)
    return { label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', ''), value }
  })
  const color = dark ? '#a78af2' : '#8057e8'
  const data = {
    labels: months.map((item) => item.label),
    datasets: [{ label: 'Solde net', data: months.map((item) => item.value), borderColor: color, backgroundColor: dark ? 'rgba(167,138,242,.12)' : 'rgba(128,87,232,.12)', fill: true, tension: .35, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: dark ? '#202025' : '#fff', pointBorderWidth: 2, borderWidth: 2 }],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${currency.format(context.raw)}` } } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: dark ? '#aaa7b2' : '#898895', font: { family: 'DM Sans', size: 10 } } },
      y: { beginAtZero: true, grid: { color: dark ? '#34333a' : '#ecebf0', drawTicks: false }, border: { display: false, dash: [3, 5] }, ticks: { color: dark ? '#aaa7b2' : '#898895', padding: 8, maxTicksLimit: 4, callback: (value) => `${new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(value)} FCFA`, font: { family: 'DM Sans', size: 9 } } },
    },
  }
  return <div className="line-chart"><Line data={data} options={options} aria-label="Évolution mensuelle du solde net" role="img" /></div>
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div>{children}</section></div>
}

export default App