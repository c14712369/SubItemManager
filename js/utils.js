// ====== js/utils.js ======
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = `<i class="fa-solid fa-check"></i> ${msg}`;
    t.className = 'toast show success';
    setTimeout(() => t.className = 'toast', 3000);
}

function getCycleLabel(cycle) {
    return {
        'monthly': '每月', 'quarterly': '每季', 'half-yearly': '每半年', 'yearly': '每年', 'fixed': '單次'
    }[cycle] || cycle;
}

function lifeMonthLabel(ym) {
    var p = ym.split('-').map(Number);
    return p[0] + ' 年 ' + p[1] + ' 月';
}

function getLifeCat(id) {
    return lifeCategories.find(function (c) { return c.id === id; }) || lifeCategories[lifeCategories.length - 1];
}

function getLifeIncCat(id) {
    var c = lifeIncomeCategories.find(function (x) { return x.id === id; });
    return c || { id: 'other', name: '其他', color: '#8A8A8A' };
}

/**
 * Fetch data with localStorage caching
 * @param {string} url - API URL
 * @param {string} cacheKey - Key for localStorage
 * @param {number} ttlHours - Time to live in hours
 * @param {boolean} forceRefresh - If true, bypass cache
 */
async function fetchWithCache(url, cacheKey, ttlHours = 6, forceRefresh = false) {
    const fullKey = `cache_${cacheKey}`;
    const rateLimitKey = `rl_${cacheKey}`;

    if (forceRefresh) {
        const lastRefresh = localStorage.getItem(rateLimitKey);
        const now = Date.now();
        if (lastRefresh && (now - parseInt(lastRefresh)) < 60000) { // 1 minute cooldown
            const remaining = Math.ceil((60000 - (now - parseInt(lastRefresh))) / 1000);
            console.log(`[Rate Limit] ${cacheKey} too frequent. Wait ${remaining}s`);
            showToast(`更新太頻繁，請稍候 (${remaining}秒)`);

            // Try fallback to cache instead of fetching
            const cached = localStorage.getItem(fullKey);
            if (cached) return JSON.parse(cached).data;
            return null; // Gracefully return null instead of throwing
        }
        localStorage.setItem(rateLimitKey, now.toString());
    }

    if (!forceRefresh) {
        const cached = localStorage.getItem(fullKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
            if (ageHours < ttlHours) {
                console.log(`[Cache Hit] ${cacheKey} (Age: ${ageHours.toFixed(2)}h)`);
                return data;
            }
        }
    }

    console.log(`[Cache Miss/Refresh] Fetching: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(fullKey, JSON.stringify(cacheData));
        return data;
    } catch (error) {
        console.error(`[Cache Fetch Error] ${url}:`, error);
        // Fallback to old cache if exists, even if expired
        const cached = localStorage.getItem(fullKey);
        if (cached) {
            console.log(`[Cache Fallback] Using expired cache for ${cacheKey}`);
            return JSON.parse(cached).data;
        }
        throw error;
    }
}
// ─────────────────────────────────────────
// ── 外幣歷史匯率 (Frankfurter API) ──
// ─────────────────────────────────────────

/** 在 session 期間存放已拉取的匯率，key: 'USD_2025-03-02' → 33.12 */
window._fxRateCache = window._fxRateCache || {};

/**
 * 計算外幣項目在指定年月的實際扣款日 (yyyy-mm-dd)
 * 扣款日 = startDate 的「日」；若超出當月天數則取當月最後一天
 */
function getBillingDateForMonth(item, year, month) {
    const startDay = item.startDate ? new Date(item.startDate).getDate() : 1;
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(startDay, lastDay);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 從 Frankfurter API 取得指定日期的 currency→TWD 匯率
 * 未來日期自動以今日匯率代替
 */
async function fetchHistoricalRate(currency, dateStr) {
    if (!currency || currency === 'TWD') return 1;
    const today = new Date().toISOString().split('T')[0];
    const queryDate = dateStr > today ? today : dateStr;
    const cacheKey = `fxhist_${currency}_${queryDate}`;
    const ttl = queryDate < today ? 8760 : 6; // 歷史:快取1年；今日:6小時
    try {
        const url = `https://api.frankfurter.app/${queryDate}?from=${currency}&to=TWD`;
        const data = await fetchWithCache(url, cacheKey, ttl);
        return data?.rates?.TWD || null;
    } catch (e) {
        return null;
    }
}

/**
 * 批次預取所有外幣項目在指定年月清單的歷史匯率，存入 window._fxRateCache
 * @param {Array} itemsList   固定支出項目陣列
 * @param {Array} yearMonthPairs  [[year, month], ...]
 */
async function prefetchFXRates(itemsList, yearMonthPairs) {
    const promises = [];
    for (const item of itemsList) {
        if (!item.currency || item.currency === 'TWD' || !item.startDate) continue;
        for (const [year, month] of yearMonthPairs) {
            const dateStr = getBillingDateForMonth(item, year, month);
            const key = `${item.currency}_${dateStr}`;
            if (window._fxRateCache[key] !== undefined) continue; // 已快取
            promises.push(
                fetchHistoricalRate(item.currency, dateStr).then(rate => {
                    if (rate !== null) window._fxRateCache[key] = rate;
                })
            );
        }
    }
    if (promises.length > 0) await Promise.all(promises);
}

/**
 * 取得某項目在指定月份的 TWD 金額（套用歷史匯率）
 * 同步讀取，需先呼叫 prefetchFXRates() 填入快取
 */
function getItemAmountForMonth(item, year, month) {
    if (!item.currency || item.currency === 'TWD') return item.amount;
    if (!item.originalAmount || !item.startDate) return item.amount;
    const dateStr = getBillingDateForMonth(item, year, month);
    const key = `${item.currency}_${dateStr}`;
    const rate = window._fxRateCache[key];
    if (rate !== undefined) return Math.round(item.originalAmount * rate);
    return item.amount; // fallback：使用儲存的快照金額
}

/**
 * Reset viewport scale to 1.0 — prevents iOS PWA zoom-in after modal input focus.
 * Call this after any modal close to snap the page back to normal zoom.
 */
function resetViewport() {
    const vp = document.querySelector('meta[name="viewport"]');
    if (!vp) return;
    // Temporarily restrict scale to force iOS to reset zoom
    vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    setTimeout(function () {
        vp.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }, 300);
}

/**
 * Helper to handle privacy masking based on amount type
 * @param {number|string} val - The value to format
 * @param {'income'|'asset'|'expense'|'fixed'|'other'} type - Category of the amount
 */
function formatAmount(val, type = 'other') {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return val;

    if (window.isPrivacyMode) {
        // Only hide income and assets
        if (type === 'income' || type === 'asset') {
            return '****';
        }
    }
    return num.toLocaleString();
}
