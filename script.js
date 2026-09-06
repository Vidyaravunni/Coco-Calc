(() => {
  const mascotPop = document.getElementById('mascotPop');
  const mascot = document.getElementById('mascot');
  const topCut = document.getElementById('topCut');
  const MAX_CHOPS = 4;
  const CUT_LENGTH = 64; // matches the line's on-screen length in the SVG

  const prevDisplay = document.getElementById('prevDisplay');
  const currDisplay = document.getElementById('currDisplay');

  const historyBtn = document.getElementById('historyBtn');
  const closeHistoryBtn = document.getElementById('closeHistory');
  const clearHistoryBtn = document.getElementById('clearHistory');
  const historyPanel = document.getElementById('historyPanel');
  const historyList = document.getElementById('historyList');
  const backdrop = document.getElementById('backdrop');

  const OPS = ['+', '-', '*', '/', '%'];
  const isOp = (t) => OPS.includes(t);

  // tokens looks like ['2', '+', '3', '-', '5', '*', '6'] — built live as the user types.
  let tokens = [];
  let justEvaluated = false;
  let lastExprText = '';
  let lastResult = '0';
  let chopCount = 0;

  // ---------- mascot state ----------
  function setChopCount(n) {
    chopCount = Math.max(0, Math.min(MAX_CHOPS, n));
    const drawn = CUT_LENGTH * (chopCount / MAX_CHOPS);
    topCut.style.strokeDashoffset = String(CUT_LENGTH - drawn);
    topCut.classList.toggle('show', chopCount > 0);
  }

  function chop() {
    if (mascot.classList.contains('opened')) {
      resetMascot();
    }
    setChopCount(chopCount + 1);
    mascot.classList.remove('shake');
    void mascot.offsetWidth; // force reflow so the animation can replay
    mascot.classList.add('shake');
  }

  function serveMascot() {
    mascot.classList.add('opened');
  }

  function resetMascot(replay) {
    mascot.classList.remove('opened');
    setChopCount(0);
    if (replay) {
      mascotPop.classList.remove('intro');
      void mascotPop.offsetWidth;
      mascotPop.classList.add('intro');
    }
  }

  // ---------- formatting ----------
  function formatNumber(numStr) {
    if (numStr === '' || numStr === '-' || numStr === undefined) return numStr || '0';
    const num = parseFloat(numStr);
    if (Number.isNaN(num)) return '0';
    return num.toLocaleString('en-US', { maximumFractionDigits: 8 });
  }

  function opSymbol(op) {
    return { '+': '+', '-': '−', '*': '×', '/': '÷', '%': '%' }[op] || op;
  }

  function exprToText(toks) {
    return toks.map((t) => (isOp(t) ? opSymbol(t) : formatNumber(t))).join(' ');
  }

  // ---------- evaluation (proper * / % before + -) ----------
  function evaluateTokens(toks) {
    const vals = [parseFloat(toks[0])];
    for (let i = 1; i < toks.length; i += 2) {
      const op = toks[i];
      const num = parseFloat(toks[i + 1]);
      if (op === '*' || op === '/' || op === '%') {
        const prev = vals.pop();
        let r;
        if (op === '*') r = prev * num;
        else if (op === '/') r = num === 0 ? NaN : prev / num;
        else r = (prev * num) / 100;
        vals.push(r);
      } else {
        vals.push(op, num);
      }
    }
    let result = vals[0];
    for (let i = 1; i < vals.length; i += 2) {
      const op = vals[i];
      const num = vals[i + 1];
      if (op === '+') result += num;
      else if (op === '-') result -= num;
    }
    return result;
  }

  // ---------- display ----------
  function render() {
    if (justEvaluated) {
      prevDisplay.textContent = `${lastExprText} =`;
      currDisplay.textContent = formatNumber(lastResult);
      return;
    }
    prevDisplay.textContent = tokens.length ? exprToText(tokens) : ' ';
    const last = tokens[tokens.length - 1];
    currDisplay.textContent = tokens.length === 0 || isOp(last) ? '0' : formatNumber(last);
  }

  // ---------- history ----------
  const HISTORY_KEY = 'coconutCalcHistory';
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    history = [];
  }

  function renderHistory() {
    historyList.innerHTML = '';
    if (history.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No calculations yet 🥥';
      historyList.appendChild(li);
      return;
    }
    history.forEach((entry) => {
      const li = document.createElement('li');
      const exprSpan = document.createElement('span');
      exprSpan.className = 'h-expr';
      exprSpan.textContent = entry.expr;
      const resultSpan = document.createElement('span');
      resultSpan.className = 'h-result';
      resultSpan.textContent = `= ${entry.result}`;
      li.append(exprSpan, resultSpan);
      li.addEventListener('click', () => {
        tokens = [entry.result];
        justEvaluated = false;
        render();
        closeHistory();
      });
      historyList.appendChild(li);
    });
  }

  function addHistory(expr, result) {
    history.unshift({ expr, result: formatNumber(result) });
    if (history.length > 20) history.length = 20;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* storage unavailable, keep in-memory only */
    }
    renderHistory();
  }

  function openHistory() {
    historyPanel.classList.add('open');
    backdrop.classList.add('open');
  }
  function closeHistory() {
    historyPanel.classList.remove('open');
    backdrop.classList.remove('open');
  }

  // ---------- input handling ----------
  function pushDigit(d) {
    if (justEvaluated) {
      tokens = [];
      justEvaluated = false;
    }
    if (tokens.length === 0 || isOp(tokens[tokens.length - 1])) {
      tokens.push(d === '.' ? '0.' : d);
    } else {
      const last = tokens[tokens.length - 1];
      if (d === '.' && last.includes('.')) {
        // ignore duplicate decimal point
      } else if (last === '0' && d !== '.') {
        tokens[tokens.length - 1] = d;
      } else {
        tokens[tokens.length - 1] = last + d;
      }
    }
    chop();
    render();
  }

  function pushOperator(op) {
    if (justEvaluated) {
      tokens = [lastResult];
      justEvaluated = false;
    }
    if (tokens.length === 0) return; // nothing typed yet to operate on
    const last = tokens[tokens.length - 1];
    if (isOp(last)) tokens[tokens.length - 1] = op;
    else tokens.push(op);
    chop();
    render();
  }

  function equals() {
    if (justEvaluated) return;
    let toks = tokens.slice();
    if (isOp(toks[toks.length - 1])) toks.pop();
    if (toks.length === 0) return;

    const result = evaluateTokens(toks);
    const resultStr = Number.isFinite(result) ? String(result) : 'Error';

    lastExprText = exprToText(toks);
    lastResult = resultStr;
    justEvaluated = true;
    render();

    if (resultStr !== 'Error') {
      serveMascot();
      addHistory(lastExprText, resultStr);
    }
  }

  function clearAll() {
    tokens = [];
    justEvaluated = false;
    render();
    resetMascot(true);
  }

  function backspace() {
    if (justEvaluated) return;
    if (tokens.length === 0) return;
    const last = tokens[tokens.length - 1];
    if (isOp(last) || last.length <= 1) tokens.pop();
    else tokens[tokens.length - 1] = last.slice(0, -1);
    render();
  }

  // ---------- wire up buttons ----------
  document.querySelectorAll('.key').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { num, op, action } = btn.dataset;
      if (num !== undefined) pushDigit(num);
      else if (action === 'decimal') pushDigit('.');
      else if (action === 'clear') clearAll();
      else if (action === 'backspace') backspace();
      else if (action === 'equals') equals();
      else if (op) pushOperator(op);
    });
  });

  historyBtn.addEventListener('click', openHistory);
  closeHistoryBtn.addEventListener('click', closeHistory);
  backdrop.addEventListener('click', closeHistory);
  clearHistoryBtn.addEventListener('click', () => {
    history = [];
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
    renderHistory();
  });

  document.addEventListener('keydown', (e) => {
    if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
    else if (e.key === '.') pushDigit('.');
    else if (['+', '-', '*', '/'].includes(e.key)) pushOperator(e.key);
    else if (e.key === 'Enter' || e.key === '=') equals();
    else if (e.key === 'Backspace') backspace();
    else if (e.key === 'Escape') {
      clearAll();
      closeHistory();
    }
  });

  render();
  renderHistory();

  // Service workers need http(s)/localhost — skip silently on file://
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        /* offline install just won't be available */
      });
    });
  }
})();
