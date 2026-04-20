'use strict'

// ── Window controls ─────────────────────────────────────────────
const { ipcRenderer } = require('electron')
document.getElementById('tbMin').addEventListener('click', () => ipcRenderer.send('window-minimize'))
document.getElementById('tbMax').addEventListener('click', () => ipcRenderer.send('window-maximize'))
document.getElementById('tbClose').addEventListener('click', () => ipcRenderer.send('window-close'))

// ── Theme switcher ──────────────────────────────────────────────
const themes = ['dark', 'light', 'midnight', 'neon', 'sunset']
let currentTheme = 'dark'

function loadTheme(name) {
  // Remove old theme stylesheet
  const old = document.getElementById('theme-stylesheet')
  if (old) old.remove()

  // Inject new theme stylesheet
  const link = document.createElement('link')
  link.id = 'theme-stylesheet'
  link.rel = 'stylesheet'
  link.href = `themes/${name}.css`
  document.head.appendChild(link)

  // Swap body class
  themes.forEach(t => document.body.classList.remove(`theme-${t}`))
  document.body.classList.add(`theme-${name}`)

  // Update sidebar active state
  document.querySelectorAll('.theme-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === name)
  })

  currentTheme = name
}

document.querySelectorAll('.theme-item').forEach(btn => {
  btn.addEventListener('click', () => loadTheme(btn.dataset.theme))
})

// ── History ─────────────────────────────────────────────────────
const historyList  = document.getElementById('historyList')
const historyEmpty = document.getElementById('historyEmpty')

function addHistoryEntry(expr, result) {
  historyEmpty.style.display = 'none'

  const li = document.createElement('li')
  li.className = 'history-entry'
  li.innerHTML = `
    <span class="history-expr">${expr}</span>
    <span class="history-result">${result}</span>
  `
  historyList.appendChild(li)
  historyList.scrollTop = historyList.scrollHeight
}

function clearHistory() {
  historyList.querySelectorAll('.history-entry').forEach(el => el.remove())
  historyEmpty.style.display = ''
}

document.getElementById('clearHistory').addEventListener('click', clearHistory)

// ── Calculator logic ────────────────────────────────────────────
const display      = document.getElementById('display')
const exprEl       = document.getElementById('expression')

let currentValue   = '0'
let previousValue  = null
let operator       = null
let waitingForNext = false
let expressionStr  = ''

function formatNumber(num) {
  const n = parseFloat(num)
  if (isNaN(n)) return 'Error'
  // Avoid scientific notation for normal range
  if (Math.abs(n) >= 1e10 || (Math.abs(n) < 1e-6 && n !== 0)) {
    return n.toPrecision(8).replace(/\.?0+$/, '')
  }
  // Trim unnecessary trailing decimals
  const str = parseFloat(n.toPrecision(10)).toString()
  return str.length > 12 ? parseFloat(n.toFixed(8)).toString() : str
}

function updateDisplay() {
  const text = formatNumber(currentValue)
  // Scale font for long numbers
  if (text.length > 9) display.style.fontSize = '40px'
  else if (text.length > 6) display.style.fontSize = '52px'
  else display.style.fontSize = '64px'

  display.textContent = text
}

function calculate(a, op, b) {
  const numA = parseFloat(a)
  const numB = parseFloat(b)
  switch (op) {
    case '÷': return numB === 0 ? 'Error' : String(numA / numB)
    case '×': return String(numA * numB)
    case '−': return String(numA - numB)
    case '+': return String(numA + numB)
    default:  return b
  }
}

function handleNumber(val) {
  if (waitingForNext) {
    currentValue   = val
    waitingForNext = false
  } else {
    currentValue = currentValue === '0' ? val : currentValue + val
  }
  updateDisplay()
}

function handleOperator(op) {
  // Clear active highlight from all operator buttons
  document.querySelectorAll('.btn-operator').forEach(b => b.classList.remove('active-op'))

  if (operator && !waitingForNext) {
    // Chain operations
    const result   = calculate(previousValue, operator, currentValue)
    expressionStr  = `${formatNumber(previousValue)} ${operator} ${formatNumber(currentValue)} =`
    currentValue   = result
    previousValue  = result
    updateDisplay()
  } else {
    previousValue = currentValue
  }

  operator       = op
  waitingForNext = true
  expressionStr  = `${formatNumber(previousValue)} ${op}`
  exprEl.textContent = expressionStr

  // Highlight active operator button
  document.querySelectorAll('.btn-operator[data-value]').forEach(b => {
    if (b.dataset.value === op) b.classList.add('active-op')
  })
}

function handleEquals() {
  if (!operator || previousValue === null) return

  document.querySelectorAll('.btn-operator').forEach(b => b.classList.remove('active-op'))

  const a       = formatNumber(previousValue)
  const b       = formatNumber(currentValue)
  const result  = calculate(previousValue, operator, currentValue)
  const exprStr = `${a} ${operator} ${b} =`

  expressionStr = exprStr
  exprEl.textContent = expressionStr

  addHistoryEntry(exprStr, formatNumber(result))

  currentValue   = result
  previousValue  = null
  operator       = null
  waitingForNext = true
  updateDisplay()
}

function handleClear() {
  currentValue   = '0'
  previousValue  = null
  operator       = null
  waitingForNext = false
  expressionStr  = ''
  exprEl.textContent = ''
  document.querySelectorAll('.btn-operator').forEach(b => b.classList.remove('active-op'))
  updateDisplay()
}

function handleSign() {
  if (currentValue === '0' || currentValue === 'Error') return
  currentValue = String(parseFloat(currentValue) * -1)
  updateDisplay()
}

function handlePercent() {
  if (currentValue === 'Error') return
  currentValue = String(parseFloat(currentValue) / 100)
  updateDisplay()
}

function handleDot() {
  if (waitingForNext) {
    currentValue   = '0.'
    waitingForNext = false
    updateDisplay()
    return
  }
  if (!currentValue.includes('.')) {
    currentValue += '.'
    display.textContent = currentValue
  }
}

// ── Button event delegation ─────────────────────────────────────
document.querySelector('.calc-grid').addEventListener('click', e => {
  const btn = e.target.closest('.btn')
  if (!btn) return

  const { action, value } = btn.dataset

  switch (action) {
    case 'number':   handleNumber(value);   break
    case 'operator': handleOperator(value); break
    case 'equals':   handleEquals();        break
    case 'clear':    handleClear();         break
    case 'sign':     handleSign();          break
    case 'percent':  handlePercent();       break
    case 'dot':      handleDot();           break
  }
})

// ── Keyboard support ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9') handleNumber(e.key)
  else if (e.key === '.') handleDot()
  else if (e.key === '+') handleOperator('+')
  else if (e.key === '-') handleOperator('−')
  else if (e.key === '*') handleOperator('×')
  else if (e.key === '/') { e.preventDefault(); handleOperator('÷') }
  else if (e.key === 'Enter' || e.key === '=') handleEquals()
  else if (e.key === 'Escape' || e.key === 'c') handleClear()
  else if (e.key === '%') handlePercent()
  else if (e.key === 'Backspace') {
    if (currentValue.length > 1 && !waitingForNext) {
      currentValue = currentValue.slice(0, -1)
      updateDisplay()
    } else {
      handleClear()
    }
  }
})

// Init
updateDisplay()
