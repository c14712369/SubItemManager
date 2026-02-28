// ====== js/ui-wealth.js ======

// ─────────────────────────────────────────
// ── 股票清單 (台股 + 美股 ETF/個股) ──
// ─────────────────────────────────────────
const STOCK_LIST = [
    // ── 台股 — 半導體 ──
    { symbol: '2330', name: '台積電', suffix: '.TW' },
    { symbol: '2303', name: '聯電', suffix: '.TW' },
    { symbol: '2379', name: '瑞昱', suffix: '.TW' },
    { symbol: '2382', name: '廣達', suffix: '.TW' },
    { symbol: '2385', name: '群光', suffix: '.TW' },
    { symbol: '2401', name: '凌陽', suffix: '.TW' },
    { symbol: '2408', name: '南亞科', suffix: '.TW' },
    { symbol: '2409', name: '友達', suffix: '.TW' },
    { symbol: '2454', name: '聯發科', suffix: '.TW' },
    { symbol: '3034', name: '聯詠', suffix: '.TW' },
    { symbol: '3037', name: '欣興', suffix: '.TW' },
    { symbol: '3711', name: '日月光投控', suffix: '.TW' },
    { symbol: '6770', name: '力積電', suffix: '.TW' },
    // ── 台股 — 金融 ──
    { symbol: '2886', name: '兆豐金', suffix: '.TW' },
    { symbol: '2884', name: '玉山金', suffix: '.TW' },
    { symbol: '2882', name: '國泰金', suffix: '.TW' },
    { symbol: '2891', name: '中信金', suffix: '.TW' },
    { symbol: '2892', name: '第一金', suffix: '.TW' },
    { symbol: '2880', name: '華南金', suffix: '.TW' },
    { symbol: '2881', name: '富邦金', suffix: '.TW' },
    { symbol: '2834', name: '臺企銀', suffix: '.TW' },
    { symbol: '2888', name: '新光金', suffix: '.TW' },
    // ── 台股 — 電子/科技 ──
    { symbol: '2317', name: '鴻海', suffix: '.TW' },
    { symbol: '2308', name: '台達電', suffix: '.TW' },
    { symbol: '2357', name: '華碩', suffix: '.TW' },
    { symbol: '2353', name: '宏碁', suffix: '.TW' },
    { symbol: '2356', name: '英業達', suffix: '.TW' },
    { symbol: '2324', name: '仁寶', suffix: '.TW' },
    { symbol: '2301', name: '光寶科', suffix: '.TW' },
    { symbol: '4938', name: '和碩', suffix: '.TW' },
    { symbol: '3008', name: '大立光', suffix: '.TW' },
    { symbol: '2376', name: '技嘉', suffix: '.TW' },
    { symbol: '2395', name: '研華', suffix: '.TW' },
    { symbol: '6415', name: '矽力-KY', suffix: '.TW' },
    // ── 台股 — 傳產/其他 ──
    { symbol: '1301', name: '台塑', suffix: '.TW' },
    { symbol: '1303', name: '南亞', suffix: '.TW' },
    { symbol: '1326', name: '台化', suffix: '.TW' },
    { symbol: '2002', name: '中鋼', suffix: '.TW' },
    { symbol: '2412', name: '中華電', suffix: '.TW' },
    { symbol: '4904', name: '遠傳', suffix: '.TW' },
    { symbol: '9910', name: '豐泰', suffix: '.TW' },
    { symbol: '2207', name: '和泰車', suffix: '.TW' },
    { symbol: '2105', name: '正新', suffix: '.TW' },
    { symbol: '1216', name: '統一', suffix: '.TW' },
    { symbol: '2912', name: '統一超', suffix: '.TW' },
    { symbol: '2801', name: '彰銀', suffix: '.TW' },
    { symbol: '9941', name: '裕融', suffix: '.TW' },
    { symbol: '5880', name: '合庫金', suffix: '.TW' },
    // ── 台股 — ETF ──
    { symbol: '0050', name: '元大台灣50', suffix: '.TW' },
    { symbol: '0051', name: '元大中型100', suffix: '.TW' },
    { symbol: '0056', name: '元大高股息', suffix: '.TW' },
    { symbol: '006208', name: '富邦台50', suffix: '.TW' },
    { symbol: '00878', name: '國泰永續高股息', suffix: '.TW' },
    { symbol: '00692', name: '富邦公司治理', suffix: '.TW' },
    { symbol: '00919', name: '群益台灣精選高息', suffix: '.TW' },
    { symbol: '00929', name: '復華台灣科技優息', suffix: '.TW' },
    { symbol: '00713', name: '元大台灣高息低波', suffix: '.TW' },
    { symbol: '00896', name: '中信綠能及電動車', suffix: '.TW' },
    { symbol: '00881', name: '國泰台灣5G+', suffix: '.TW' },
    { symbol: '00830', name: '國泰費城半導體', suffix: '.TW' },
    { symbol: '00757', name: '統一FANG+', suffix: '.TW' },
    // ── 美股 — 個股 ──
    { symbol: 'AAPL', name: 'Apple', suffix: '' },
    { symbol: 'MSFT', name: 'Microsoft', suffix: '' },
    { symbol: 'NVDA', name: 'NVIDIA', suffix: '' },
    { symbol: 'GOOGL', name: 'Alphabet (Google)', suffix: '' },
    { symbol: 'AMZN', name: 'Amazon', suffix: '' },
    { symbol: 'META', name: 'Meta Platforms', suffix: '' },
    { symbol: 'TSLA', name: 'Tesla', suffix: '' },
    { symbol: 'AVGO', name: 'Broadcom', suffix: '' },
    { symbol: 'TSM', name: 'Taiwan Semiconductor (ADR)', suffix: '' },
    { symbol: 'NFLX', name: 'Netflix', suffix: '' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', suffix: '' },
    { symbol: 'INTC', name: 'Intel', suffix: '' },
    { symbol: 'QCOM', name: 'Qualcomm', suffix: '' },
    { symbol: 'ASML', name: 'ASML Holding', suffix: '' },
    { symbol: 'BABA', name: 'Alibaba', suffix: '' },
    { symbol: 'V', name: 'Visa', suffix: '' },
    { symbol: 'JPM', name: 'JPMorgan Chase', suffix: '' },
    { symbol: 'MA', name: 'Mastercard', suffix: '' },
    { symbol: 'COST', name: 'Costco', suffix: '' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway B', suffix: '' },
    { symbol: 'COIN', name: 'Coinbase', suffix: '' },
    { symbol: 'MSTR', name: 'MicroStrategy', suffix: '' },
    { symbol: 'PLTR', name: 'Palantir', suffix: '' },
    { symbol: 'SNOW', name: 'Snowflake', suffix: '' },
    // ── 美股 ETF ──
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', suffix: '' },
    { symbol: 'QQQ', name: 'Invesco NASDAQ-100 ETF', suffix: '' },
    { symbol: 'VTI', name: 'Vanguard Total Market ETF', suffix: '' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', suffix: '' },
    { symbol: 'SCHD', name: 'Schwab Dividend ETF', suffix: '' },
    { symbol: 'JEPI', name: 'JPMorgan Equity Premium Income ETF', suffix: '' },
    { symbol: 'JEPQ', name: 'JPMorgan NASDAQ Equity Premium ETF', suffix: '' },
    { symbol: 'SOXL', name: 'Direxion Semi Bull 3x ETF', suffix: '' },
    { symbol: 'GLD', name: 'SPDR Gold Shares ETF', suffix: '' },
    { symbol: 'TLT', name: 'iShares 20Y+ Treasury ETF', suffix: '' },
    // ── 加密貨幣相關 ETF ──
    { symbol: 'IBIT', name: 'iShares Bitcoin Trust ETF', suffix: '' },
    { symbol: 'FBTC', name: 'Fidelity Wise Origin Bitcoin Fund', suffix: '' },
];

// ─────────────────────────────────────────
// ── Autocomplete Logic ──
// ─────────────────────────────────────────
let _stockDropdownIndex = -1;  // keyboard nav index
let _stockDropdownItems = [];  // current filtered items

function onStockSearchInput(query) {
    const q = query.trim();
    const dropdown = document.getElementById('stockDropdown');

    if (!q) {
        dropdown.style.display = 'none';
        _stockDropdownItems = [];
        return;
    }

    const lower = q.toLowerCase();
    _stockDropdownItems = STOCK_LIST.filter(s =>
        s.symbol.toLowerCase().startsWith(lower) ||
        s.name.toLowerCase().includes(lower)
    ).slice(0, 8);

    if (_stockDropdownItems.length === 0) {
        // 沒有符合 → 提示「按 Enter 直接確認」
        dropdown.innerHTML = `<div class="stock-dropdown-hint">按 Enter 直接使用「${q}」</div>`;
        dropdown.style.display = 'block';
        _stockDropdownIndex = -1;
        // 清除上次選擇
        document.getElementById('holdingSymbolInput').value = '';
        document.getElementById('holdingNameInput').value = '';
        return;
    }

    _stockDropdownIndex = -1;
    dropdown.innerHTML = _stockDropdownItems.map((s, i) => `
        <div class="stock-dropdown-item" data-idx="${i}" onclick="selectStockItem(${i})">
            <span class="stock-dd-symbol">${s.symbol}</span>
            <span class="stock-dd-name">${s.name}</span>
        </div>
    `).join('');
    dropdown.style.display = 'block';
}

function onStockSearchKeydown(event) {
    const dropdown = document.getElementById('stockDropdown');
    const items = dropdown.querySelectorAll('.stock-dropdown-item');

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        _stockDropdownIndex = Math.min(_stockDropdownIndex + 1, items.length - 1);
        _highlightDropdownItem(items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        _stockDropdownIndex = Math.max(_stockDropdownIndex - 1, -1);
        _highlightDropdownItem(items);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (_stockDropdownIndex >= 0 && _stockDropdownIndex < _stockDropdownItems.length) {
            selectStockItem(_stockDropdownIndex);
        } else {
            // 直接確認搜尋框中輸入的代號
            const raw = document.getElementById('holdingSearchInput').value.trim().toUpperCase();
            if (raw) confirmCustomSymbol(raw);
        }
    } else if (event.key === 'Escape') {
        dropdown.style.display = 'none';
    }
}

function _highlightDropdownItem(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === _stockDropdownIndex));
    if (_stockDropdownIndex >= 0) items[_stockDropdownIndex]?.scrollIntoView({ block: 'nearest' });
}

async function selectStockItem(idx) {
    const stock = _stockDropdownItems[idx];
    if (!stock) return;

    const dropdown = document.getElementById('stockDropdown');
    dropdown.style.display = 'none';

    document.getElementById('holdingSearchInput').value = `${stock.symbol}  ${stock.name}`;
    document.getElementById('holdingSymbolInput').value = stock.symbol;
    document.getElementById('holdingNameInput').value = stock.name;
    document.getElementById('holdingSelectedSymbol').textContent = stock.symbol;
    document.getElementById('holdingSelectedName').textContent = stock.name;
    document.getElementById('holdingSelectedPrice').innerHTML = '<i class="fa-solid fa-rotate fa-spin" style="font-size:0.8rem;"></i>';
    document.getElementById('holdingSelectedInfo').style.display = 'block';

    // 自動抓取股價
    const fullSymbol = stock.symbol + stock.suffix;
    const price = await fetchStockPrice(fullSymbol);
    const priceEl = document.getElementById('holdingSelectedPrice');
    if (price !== null) {
        priceEl.textContent = '現價 NT$ ' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        // 把股價填入 manual price 欄位供使用者確認
        document.getElementById('holdingPriceInput').value = price;
    } else {
        priceEl.textContent = '無法取得報價（可手動輸入）';
    }
}

async function confirmCustomSymbol(rawSymbol) {
    document.getElementById('holdingSymbolInput').value = rawSymbol;
    document.getElementById('holdingNameInput').value = '';
    document.getElementById('holdingSelectedSymbol').textContent = rawSymbol;
    document.getElementById('holdingSelectedName').textContent = '';
    document.getElementById('holdingSelectedPrice').innerHTML = '<i class="fa-solid fa-rotate fa-spin" style="font-size:0.8rem;"></i>';
    document.getElementById('holdingSelectedInfo').style.display = 'block';
    document.getElementById('stockDropdown').style.display = 'none';

    const price = await fetchStockPrice(rawSymbol);
    const priceEl = document.getElementById('holdingSelectedPrice');
    if (price !== null) {
        priceEl.textContent = '現價 NT$ ' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('holdingPriceInput').value = price;
    } else {
        priceEl.textContent = '無法取得報價（可手動輸入）';
    }
}

// 點擊外側關閉 dropdown
document.addEventListener('click', function (e) {
    const wrap = document.getElementById('stockSearchWrap');
    if (wrap && !wrap.contains(e.target)) {
        const dd = document.getElementById('stockDropdown');
        if (dd) dd.style.display = 'none';
    }
    const bankWrap = document.getElementById('bankSearchWrap');
    if (bankWrap && !bankWrap.contains(e.target)) {
        const bdd = document.getElementById('bankDropdown');
        if (bdd) bdd.style.display = 'none';
    }
});

// ─────────────────────────────────────────
// ── 銀行帳戶 Autocomplete ──
// ─────────────────────────────────────────
const BANK_LIST = [
    '台灣銀行 — 活存', '台灣銀行 — 定存',
    '郵局 — 活存', '郵局 — 定期儲金',
    '合作金庫 — 活存', '合作金庫 — 定存',
    '第一銀行 — 活存', '第一銀行 — 定存',
    '華南銀行 — 活存', '華南銀行 — 定存',
    '彰化銀行 — 活存',
    '兆豐銀行 — 活存', '兆豐銀行 — 定存',
    '台北富邦 — 活存', '台北富邦 — 定存',
    '國泰世華 — 活存', '國泰世華 — 定存',
    '中國信託 — 活存', '中國信託 — 定存',
    '玉山銀行 — 活存', '玉山銀行 — 定存',
    '台新銀行 — 活存', '台新銀行 — 定存',
    '富邦銀行 — 活存',
    '永豐銀行 — 活存', '永豐銀行 — 定存',
    '遠東銀行 — 活存',
    '星展銀行 — 數位帳戶',
    '將來銀行 — 數位帳戶',
    '樂天銀行 — 數位帳戶',
    'LINE Bank — 數位帳戶',
    '現金',
    '美股券商 (Firstrade)',
    '美股券商 (Interactive Brokers)',
    '台股券商保留款',
];

let _bankDropdownItems = [];
let _bankDropdownIndex = -1;

function onBankSearchInput(query) {
    const dropdown = document.getElementById('bankDropdown');
    if (!dropdown) return;
    const q = (query || '').trim().toLowerCase();

    // 空白時顯示全部，否則篩選
    _bankDropdownItems = q
        ? BANK_LIST.filter(b => b.toLowerCase().includes(q))
        : BANK_LIST;

    if (_bankDropdownItems.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    _bankDropdownIndex = -1;
    dropdown.innerHTML = _bankDropdownItems.map((b, i) => `
        <div class="stock-dropdown-item bank-dd-item" data-idx="${i}" onclick="selectBankItem(${i})">
            ${b}
        </div>
    `).join('');
    dropdown.style.display = 'block';
}

function onBankSearchKeydown(event) {
    const dropdown = document.getElementById('bankDropdown');
    const items = dropdown ? dropdown.querySelectorAll('.bank-dd-item') : [];

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        _bankDropdownIndex = Math.min(_bankDropdownIndex + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('active', i === _bankDropdownIndex));
        if (_bankDropdownIndex >= 0) items[_bankDropdownIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        _bankDropdownIndex = Math.max(_bankDropdownIndex - 1, -1);
        items.forEach((el, i) => el.classList.toggle('active', i === _bankDropdownIndex));
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (_bankDropdownIndex >= 0 && _bankDropdownItems[_bankDropdownIndex]) {
            selectBankItem(_bankDropdownIndex);
        } else if (dropdown) {
            dropdown.style.display = 'none';
        }
    } else if (event.key === 'Escape') {
        if (dropdown) dropdown.style.display = 'none';
    }
}

function selectBankItem(idx) {
    const name = _bankDropdownItems[idx];
    if (!name) return;
    document.getElementById('bankNameInput').value = name;
    document.getElementById('bankDropdown').style.display = 'none';
}



// ─────────────────────────────────────────
// ── 資料陣列 (由 localStorage 載入) ──
// ─────────────────────────────────────────
let wealthHoldings = [];      // [{ id, symbol, name, shares, lastPrice, lastUpdated }]
let wealthBankAccounts = [];  // [{ id, bankName, balance, rate }]

const WEALTH_HOLDINGS_KEY = 'wealthHoldings_v1';
const WEALTH_BANKS_KEY = 'wealthBanks_v1';



// ── 初始化 ──
function initWealthTab() {
    // 載入持股
    try {
        const h = localStorage.getItem(WEALTH_HOLDINGS_KEY);
        wealthHoldings = h ? JSON.parse(h) : [];
    } catch (e) { wealthHoldings = []; }

    // 載入銀行帳戶
    try {
        const b = localStorage.getItem(WEALTH_BANKS_KEY);
        wealthBankAccounts = b ? JSON.parse(b) : [];
    } catch (e) { wealthBankAccounts = []; }

    // 載入試算參數
    try {
        var stored = localStorage.getItem(WEALTH_PARAMS_KEY);
        if (stored) {
            var params = JSON.parse(stored);
            if (params.invRate !== undefined) document.getElementById('wealthInvestRateInput').value = params.invRate;
            if (params.invMonthly !== undefined) document.getElementById('wealthInvestMonthlyInput').value = params.invMonthly;
            if (params.cashRate !== undefined) document.getElementById('wealthCashRateInput').value = params.cashRate;
            if (params.cashMonthly !== undefined) document.getElementById('wealthCashMonthlyInput').value = params.cashMonthly;
            if (params.target !== undefined) document.getElementById('wealthTargetInput').value = params.target;
            if (params.autoSync !== undefined) {
                const toggle = document.getElementById('autoSyncWealthToggle');
                if (toggle) toggle.checked = params.autoSync;
            }
        }
    } catch (e) { console.error(e); }

    renderHoldings();
    renderBankAccounts();
    calculateWealth();
}

function saveWealthData() {
    localStorage.setItem(WEALTH_HOLDINGS_KEY, JSON.stringify(wealthHoldings));
    localStorage.setItem(WEALTH_BANKS_KEY, JSON.stringify(wealthBankAccounts));
}

// ── 計算總資產 ──
function getTotalInvestmentValue() {
    return wealthHoldings.reduce((sum, h) => sum + (h.shares * (h.lastPrice || 0)), 0);
}

function getTotalCashBalance() {
    return wealthBankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
}

// ─────────────────────────────────────────
// ── 持股管理 ──
// ─────────────────────────────────────────
function renderHoldings() {
    const container = document.getElementById('holdingsList');
    if (!container) return;

    const totalValue = getTotalInvestmentValue();
    document.getElementById('holdingsTotalValue').textContent = 'NT$ ' + Math.round(totalValue).toLocaleString();

    if (wealthHoldings.length === 0) {
        container.innerHTML = '<div class="wealth-empty">尚未新增持股，點擊「＋ 新增」開始</div>';
        return;
    }

    container.innerHTML = wealthHoldings.map(h => {
        const value = h.shares * (h.lastPrice || 0);
        const priceDisplay = h.lastPrice ? 'NT$ ' + h.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
        const valueDisplay = h.lastPrice ? 'NT$ ' + Math.round(value).toLocaleString() : '—';
        const updatedDisplay = h.lastUpdated ? new Date(h.lastUpdated).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '';
        return `
            <div class="wealth-row" data-id="${h.id}">
                <div class="wealth-row-left">
                    <span class="wealth-row-symbol">${h.symbol}</span>
                    <span class="wealth-row-name">${h.name || ''}</span>
                </div>
                <div class="wealth-row-mid">
                    <span class="wealth-row-detail">${h.shares.toLocaleString()} 股</span>
                    <span class="wealth-row-price">${priceDisplay}
                        ${updatedDisplay ? `<span class="wealth-row-time">${updatedDisplay}</span>` : ''}
                    </span>
                </div>
                <div class="wealth-row-value">${valueDisplay}</div>
                <div class="wealth-row-actions">
                    <button class="icon-btn" onclick="fetchSinglePrice('${h.id}')" title="更新價格"><i class="fa-solid fa-rotate"></i></button>
                    <button class="icon-btn delete" onclick="deleteHolding('${h.id}')" title="刪除"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddHoldingModal() {
    // Reset autocomplete UI
    document.getElementById('holdingSearchInput').value = '';
    document.getElementById('holdingSymbolInput').value = '';
    document.getElementById('holdingNameInput').value = '';
    document.getElementById('holdingSharesInput').value = '';
    document.getElementById('holdingPriceInput').value = '';
    document.getElementById('holdingSelectedInfo').style.display = 'none';
    const dd = document.getElementById('stockDropdown');
    if (dd) dd.style.display = 'none';
    document.getElementById('holdingModalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('holdingSearchInput').focus(), 80);
}

function closeAddHoldingModal() {
    document.getElementById('holdingModalOverlay').classList.remove('active');
}

async function saveHolding() {
    // Symbol comes from hidden input (set by autocomplete or confirmCustomSymbol)
    let symbol = document.getElementById('holdingSymbolInput').value.trim().toUpperCase();
    const name = document.getElementById('holdingNameInput').value.trim();
    const shares = parseFloat(document.getElementById('holdingSharesInput').value);
    const manualPrice = parseFloat(document.getElementById('holdingPriceInput').value);

    // Allow fallback: if user typed directly without selecting, try to use search input as symbol
    if (!symbol) {
        const raw = document.getElementById('holdingSearchInput').value.trim().toUpperCase();
        if (raw) symbol = raw;
    }

    if (!symbol || !shares || shares <= 0) {
        showToast('請先選擇股票並填寫股數'); return;
    }

    const holding = {
        id: crypto.randomUUID(),
        symbol,
        name,
        shares,
        lastPrice: manualPrice > 0 ? manualPrice : null,
        lastUpdated: manualPrice > 0 ? new Date().toISOString() : null
    };

    wealthHoldings.push(holding);
    saveWealthData();
    closeAddHoldingModal();
    renderHoldings();
    calculateWealth();
    showToast(`${symbol} 已新增`);

    // 如果沒有手動輸入股價，嘗試抓取
    if (!manualPrice) {
        await fetchSinglePrice(holding.id);
    }
}

function deleteHolding(id) {
    if (!confirm('確定刪除此持股？')) return;
    wealthHoldings = wealthHoldings.filter(h => h.id !== id);
    saveWealthData();
    renderHoldings();
    calculateWealth();
    showToast('已刪除');
}

async function fetchSinglePrice(id) {
    const h = wealthHoldings.find(x => x.id === id);
    if (!h) return;

    const btn = document.querySelector(`.wealth-row[data-id="${id}"] .fa-rotate`);
    if (btn) btn.classList.add('fa-spin');

    try {
        const price = await fetchStockPrice(h.symbol);
        if (price !== null) {
            h.lastPrice = price;
            h.lastUpdated = new Date().toISOString();
            saveWealthData();
            renderHoldings();
            calculateWealth();
            showToast(`${h.symbol} 更新至 NT$ ${price.toLocaleString()}`);
        } else {
            showToast(`${h.symbol} 無法取得股價，請手動輸入`);
        }
    } catch (e) {
        showToast('股價抓取失敗');
    } finally {
        if (btn) btn.classList.remove('fa-spin');
    }
}

async function refreshAllPrices() {
    if (wealthHoldings.length === 0) { showToast('尚未新增持股'); return; }
    showToast('更新中...');
    for (const h of wealthHoldings) {
        try {
            const price = await fetchStockPrice(h.symbol);
            if (price !== null) {
                h.lastPrice = price;
                h.lastUpdated = new Date().toISOString();
            }
        } catch (e) { /* skip */ }
    }
    saveWealthData();
    renderHoldings();
    calculateWealth();
    showToast('股價已全部更新');
}

// Yahoo Finance API — 台股加 .TW 後綴，美股直接用代號
async function fetchStockPrice(rawSymbol) {
    // 如果是純數字且 4 碼，判斷為台股
    const symbol = /^\d{4,5}$/.test(rawSymbol) ? rawSymbol + '.TW' : rawSymbol;
    // 使用 CORS 代理伺服器
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const res = await fetch(proxyUrl);
        if (!res.ok) return null;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return null;
        // 優先用 regularMarketPrice（盤中），否則用 previousClose
        const price = meta.regularMarketPrice || meta.previousClose || null;
        return price;
    } catch (e) {
        console.error("Fetch error via proxy:", e);
        return null;
    }
}

// ─────────────────────────────────────────
// ── 銀行帳戶管理 ──
// ─────────────────────────────────────────
function renderBankAccounts() {
    const container = document.getElementById('bankAccountsList');
    if (!container) return;

    const total = getTotalCashBalance();
    document.getElementById('bankTotalValue').textContent = 'NT$ ' + Math.round(total).toLocaleString();

    if (wealthBankAccounts.length === 0) {
        container.innerHTML = '<div class="wealth-empty">尚未新增帳戶，點擊「＋ 新增」開始</div>';
        return;
    }

    container.innerHTML = wealthBankAccounts.map(a => {
        return `
            <div class="wealth-row">
                <div class="wealth-row-left">
                    <span class="wealth-row-symbol" style="font-size:0.9rem;">${a.bankName}</span>
                </div>
                <div class="wealth-row-mid">
                    <span class="wealth-row-detail">利率 ${a.rate || 0}%</span>
                </div>
                <div class="wealth-row-value">NT$ ${Math.round(a.balance || 0).toLocaleString()}</div>
                <div class="wealth-row-actions">
                    <button class="icon-btn" onclick="editBankAccount('${a.id}')" title="編輯"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn delete" onclick="deleteBankAccount('${a.id}')" title="刪除"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddBankModal(editId) {
    const modal = document.getElementById('bankModalOverlay');
    document.getElementById('bankIdInput').value = editId || '';

    if (editId) {
        const acc = wealthBankAccounts.find(a => a.id === editId);
        if (acc) {
            document.getElementById('bankNameInput').value = acc.bankName;
            document.getElementById('bankBalanceInput').value = acc.balance;
            document.getElementById('bankRateInput').value = acc.rate || 0;
        }
    } else {
        document.getElementById('bankNameInput').value = '';
        document.getElementById('bankBalanceInput').value = '';
        document.getElementById('bankRateInput').value = '0';
    }
    modal.classList.add('active');
    document.getElementById('bankNameInput').focus();
}

function closeAddBankModal() {
    document.getElementById('bankModalOverlay').classList.remove('active');
}

function editBankAccount(id) {
    openAddBankModal(id);
}

function saveBankAccount() {
    const editId = document.getElementById('bankIdInput').value;
    const bankName = document.getElementById('bankNameInput').value.trim();
    const balance = parseFloat(document.getElementById('bankBalanceInput').value) || 0;
    const rate = parseFloat(document.getElementById('bankRateInput').value) || 0;

    if (!bankName) { showToast('請填寫銀行名稱'); return; }

    if (editId) {
        const acc = wealthBankAccounts.find(a => a.id === editId);
        if (acc) { acc.bankName = bankName; acc.balance = balance; acc.rate = rate; }
    } else {
        wealthBankAccounts.push({ id: crypto.randomUUID(), bankName, balance, rate });
    }

    saveWealthData();
    closeAddBankModal();
    renderBankAccounts();
    calculateWealth();
    showToast(editId ? '帳戶已更新' : '帳戶已新增');
}

function deleteBankAccount(id) {
    if (!confirm('確定刪除此帳戶？')) return;
    wealthBankAccounts = wealthBankAccounts.filter(a => a.id !== id);
    saveWealthData();
    renderBankAccounts();
    calculateWealth();
    showToast('已刪除');
}

// ─────────────────────────────────────────
// ── 試算邏輯 (保留原有計算) ──
// ─────────────────────────────────────────
function useMonthlyBalanceForWealth() {
    var stats = calculateStats();
    var incomeInput = document.getElementById('monthlyIncomeInput');
    var estimated = parseFloat(incomeInput ? incomeInput.value : 0) || 0;
    var actualIncome = getLifeIncomeForMonth(lifeCurrentMonth);
    var lifeExpense = getLifeOnlyExpForMonth(lifeCurrentMonth);

    var income = actualIncome > 0 ? actualIncome : estimated;
    var remaining = income - stats.monthly - lifeExpense;

    var invMonthly = parseFloat(document.getElementById('wealthInvestMonthlyInput').value) || 0;
    var cashAvailable = Math.max(0, Math.round(remaining - invMonthly));

    document.getElementById('wealthCashMonthlyInput').value = cashAvailable;
    calculateWealth();
    showToast('已帶入剩餘結餘作為每月存款：NT$ ' + cashAvailable.toLocaleString());
}

let wealthDebounceTimer = null;
function calculateWealth() {
    if (wealthDebounceTimer) clearTimeout(wealthDebounceTimer);
    wealthDebounceTimer = setTimeout(_doCalculateWealth, 300);
}

function _doCalculateWealth() {
    // 從持股和銀行帳戶自動帶入現有資產
    var invCurrent = getTotalInvestmentValue();
    var cashCurrent = getTotalCashBalance();

    // 更新顯示
    const invCurrentEl = document.getElementById('wealthInvestCurrentDisplay');
    const cashCurrentEl = document.getElementById('wealthCashCurrentDisplay');
    if (invCurrentEl) invCurrentEl.textContent = 'NT$ ' + Math.round(invCurrent).toLocaleString();
    if (cashCurrentEl) cashCurrentEl.textContent = 'NT$ ' + Math.round(cashCurrent).toLocaleString();

    var invMonthly = parseFloat(document.getElementById('wealthInvestMonthlyInput').value) || 0;
    var invRate = parseFloat(document.getElementById('wealthInvestRateInput').value) || 0;
    var invMonthlyRate = (invRate / 100) / 12;

    var autoSync = document.getElementById('autoSyncWealthToggle').checked;
    if (autoSync) {
        var stats = typeof calculateStats === 'function' ? calculateStats() : { monthly: 0 };
        var incomeInput = document.getElementById('monthlyIncomeInput');
        var estimated = parseFloat(incomeInput ? incomeInput.value : 0) || 0;
        var actualIncome = typeof getLifeIncomeForMonth === 'function' ? getLifeIncomeForMonth(lifeCurrentMonth) : 0;
        var lifeExpense = typeof getLifeOnlyExpForMonth === 'function' ? getLifeOnlyExpForMonth(lifeCurrentMonth) : 0;

        var income = actualIncome > 0 ? actualIncome : estimated;
        var remaining = income - stats.monthly - lifeExpense;
        var cashAvailable = Math.max(0, Math.round(remaining - invMonthly));
        document.getElementById('wealthCashMonthlyInput').value = cashAvailable;
    }

    var cashMonthly = parseFloat(document.getElementById('wealthCashMonthlyInput').value) || 0;
    var cashRate = parseFloat(document.getElementById('wealthCashRateInput').value) || 0;
    var cashMonthlyRate = (cashRate / 100) / 12;

    var targetFV = parseFloat(document.getElementById('wealthTargetInput').value) || 0;

    localStorage.setItem(WEALTH_PARAMS_KEY, JSON.stringify({
        invRate: document.getElementById('wealthInvestRateInput').value,
        invMonthly: document.getElementById('wealthInvestMonthlyInput').value,
        cashRate: document.getElementById('wealthCashRateInput').value,
        cashMonthly: document.getElementById('wealthCashMonthlyInput').value,
        target: document.getElementById('wealthTargetInput').value,
        autoSync: autoSync
    }));
    if (typeof triggerCloudSync === 'function') triggerCloudSync();

    var resultEl = document.getElementById('wealthResultText');
    var summaryEl = document.getElementById('wealthSummaryText');

    if (targetFV <= 0) {
        resultEl.textContent = '請輸入有效的目標金額';
        summaryEl.textContent = '';
        renderWealthChart([], [], [], [], 0);
        return;
    }

    var totalCurrent = invCurrent + cashCurrent;

    if (totalCurrent >= targetFV) {
        resultEl.textContent = '您已經達標了！🎉';
        summaryEl.textContent = '當前總資產已等於或超過目標金額。';
        renderWealthChart([0], [cashCurrent], [invCurrent], [totalCurrent], targetFV);
        return;
    }

    if (invMonthly <= 0 && cashMonthly <= 0 && invRate <= 0 && cashRate <= 0) {
        resultEl.textContent = '無法達標';
        summaryEl.textContent = '每月沒有新資金投入，且無利息或報酬增長，資產無法增加。';
        renderWealthChart([], [], [], [], targetFV);
        return;
    }

    var curInv = invCurrent;
    var curCash = cashCurrent;
    var total = totalCurrent;
    var months = 0;
    var MAX_MONTHS = 1200;

    var dataLabels = ['第 0 年'];
    var cashData = [curCash];
    var investData = [curInv];
    var totalData = [total];

    while (total < targetFV && months < MAX_MONTHS) {
        months++;
        curInv = curInv * (1 + invMonthlyRate) + invMonthly;
        curCash = curCash * (1 + cashMonthlyRate) + cashMonthly;
        total = curInv + curCash;

        if (months % 12 === 0 || total >= targetFV) {
            var yearLabel = '第 ' + Math.ceil(months / 12) + ' 年' + (months % 12 !== 0 ? ' (' + (months % 12) + '個月)' : '');
            dataLabels.push(yearLabel);
            cashData.push(curCash);
            investData.push(curInv);
            totalData.push(total);
        }
    }

    if (months >= MAX_MONTHS) {
        resultEl.textContent = '超過 100 年才能達標';
        summaryEl.textContent = '依目前條件需耗時太久，請考慮增加每月投入或預期報酬。';
    } else {
        var y = Math.floor(months / 12);
        var m = months % 12;
        var timeStr = (y > 0 ? y + ' 年 ' : '') + (m > 0 ? m + ' 個月' : (y === 0 ? '不到 1 個月' : ''));
        resultEl.textContent = '約需 ' + timeStr;
        summaryEl.textContent = '總結累積：NT$ ' + Math.round(total).toLocaleString() + ' (現金 NT$ ' + Math.round(curCash).toLocaleString() + ' / 投資 NT$ ' + Math.round(curInv).toLocaleString() + ')';
    }

    renderWealthChart(dataLabels, cashData, investData, totalData, targetFV);
}

function renderWealthChart(labels, cashData, investData, totalData, targetFV) {
    var ctx = document.getElementById('wealthChart');
    if (!ctx) return;

    if (wealthChartInstance) {
        wealthChartInstance.destroy();
        wealthChartInstance = null;
    }

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var textColor = isDark ? '#F0EDE8' : '#1A1A1A';
    var gridColor = isDark ? '#2D2B28' : '#E8E5E0';
    var targetLineArr = new Array(labels.length).fill(targetFV);

    wealthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '現金/活存累積',
                    data: cashData,
                    borderColor: '#10b981',
                    backgroundColor: '#10b98133',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '投資部位累積',
                    data: investData,
                    borderColor: '#3b82f6',
                    backgroundColor: '#3b82f633',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '總資產',
                    data: totalData,
                    borderColor: '#8b5cf6',
                    backgroundColor: '#8b5cf633',
                    borderWidth: 3,
                    pointRadius: 3,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: '目標金額',
                    data: targetLineArr,
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': NT$ ' + Math.round(context.raw).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: textColor,
                        callback: function (val) { return 'NT$ ' + (val / 10000).toLocaleString() + '萬'; }
                    },
                    grid: { color: gridColor }
                },
                x: { ticks: { color: textColor }, grid: { display: false } }
            }
        }
    });
}
