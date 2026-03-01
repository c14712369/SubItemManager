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
