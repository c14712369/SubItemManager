// ====== js/supabase-sync.js ======
let currentUser = null;
let lastSyncTime = 0;
let isFetchingFromServer = false; // Guard: block local→cloud sync while downloading

// Listen for auth state changes (login, logout, refresh)
supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();

    if (event === 'SIGNED_IN') {
        fetchFromServer();
    } else if (event === 'SIGNED_OUT') {
        showToast('已登出，切換為本地端模式');
    }
});

// Check initial session on load
async function checkSession(skipFetch = false) {
    // Immediately block any pending local→cloud sync that may have been
    // scheduled by initWealthTab() or other init code, before we even know
    // whether there's a session. This prevents the race where a 1500ms
    // debounced sync fires and overwrites the cloud before we download.
    isFetchingFromServer = true;
    if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }

    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    updateAuthUI();
    if (currentUser && !skipFetch) {
        // Automatically fetch latest on fresh reload if logged in
        // fetchFromServer() will release isFetchingFromServer in its finally block
        await fetchFromServer();
    } else {
        isFetchingFromServer = false; // No fetch needed, release the guard
    }
}

// Update UI based on auth state
function updateAuthUI() {
    const loginBtn = document.getElementById('authLoginBtn');
    const userEmailSpan = document.getElementById('authUserEmail');

    if (loginBtn && userEmailSpan) {
        if (currentUser) {
            loginBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> 登出';
            loginBtn.onclick = handleLogout;
            userEmailSpan.textContent = currentUser.email;
            userEmailSpan.style.display = 'inline';
        } else {
            loginBtn.innerHTML = '<i class="fa-solid fa-user"></i> 登入 / 註冊';
            loginBtn.onclick = openAuthModal;
            userEmailSpan.style.display = 'none';
        }
    }
}

// Auth Mode: 'login' | 'register'
window._authMode = 'login';

function switchAuthMode(mode) {
    window._authMode = mode;

    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const submitBtn = document.getElementById('authSubmitBtn');
    const modalTitle = document.getElementById('authModalTitle');
    const pwdInput = document.getElementById('authPassword');
    const bar = document.getElementById('passwordStrengthBar');

    tabLogin.classList.toggle('active', mode === 'login');
    tabRegister.classList.toggle('active', mode === 'register');

    if (mode === 'login') {
        if (modalTitle) modalTitle.textContent = '登入';
        if (submitBtn) submitBtn.textContent = '登入';
        if (pwdInput) pwdInput.setAttribute('autocomplete', 'current-password');
    } else {
        if (modalTitle) modalTitle.textContent = '註冊新帳號';
        if (submitBtn) submitBtn.textContent = '建立帳號';
        if (pwdInput) pwdInput.setAttribute('autocomplete', 'new-password');
    }

    // 切換模式時清空密碼與強度條
    if (pwdInput) pwdInput.value = '';
    if (bar) bar.style.display = 'none';
}

// Password Strength Checker（僅在註冊模式顯示）
function checkPasswordStrength(pwd) {
    if (window._authMode !== 'register') return; // 登入時不顯示

    const bar = document.getElementById('passwordStrengthBar');
    const fill = document.getElementById('passwordStrengthFill');
    const label = document.getElementById('passwordStrengthLabel');
    if (!bar || !fill || !label) return;

    if (!pwd) { bar.style.display = 'none'; return; }
    bar.style.display = 'block';

    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const levels = [
        { pct: '20%', color: '#ef4444', text: '非常弱' },
        { pct: '40%', color: '#f97316', text: '弱' },
        { pct: '60%', color: '#eab308', text: '中等' },
        { pct: '80%', color: '#22c55e', text: '強' },
        { pct: '100%', color: '#10b981', text: '非常強' }
    ];
    const lv = levels[Math.min(score, 4)];
    fill.style.width = lv.pct;
    fill.style.background = lv.color;
    label.textContent = `密碼強度：${lv.text}`;
    label.style.color = lv.color;
}

// Auth Actions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    if (window._authMode === 'register') {
        // ── 註冊流程 ──
        if (password.length < 8) {
            alert('密碼至少需要 8 個字元，建議包含大小寫英文、數字及特殊符號。');
            return;
        }
        const { error: signUpError } = await supabaseClient.auth.signUp({ email, password });
        if (signUpError) {
            alert('註冊失敗：' + signUpError.message);
            return;
        }
        alert('註冊成功！請檢查您的信箱以驗證帳號，或直接登入（視 Supabase 設定而定）。');
        closeAuthModal();
        return;
    }

    // ── 登入流程 ──
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            alert('帳號或密碼錯誤，請確認後再試。\n\n尚未有帳號？請切換至「註冊」頁面。');
        } else {
            alert('登入發生錯誤：' + error.message);
        }
        return;
    }

    // Save email for next time
    localStorage.setItem('last_login_email', email);
    closeAuthModal();
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
}

// -----------------------------------------
// Data Synchronization
// -----------------------------------------

// Pack current state data into a JSON structure
function exportStateAsJSON() {
    var storedIncome = localStorage.getItem(INCOME_KEY);
    var storedWealth = localStorage.getItem(WEALTH_PARAMS_KEY);

    return {
        items: items || [],
        categories: categories || [],
        lifeExpenses: lifeExpenses || [],
        lifeCategories: lifeCategories || [],
        lifeIncomeCategories: lifeIncomeCategories || [],
        lifeBudgets: lifeBudgets || {},
        projects: projects || [],
        projectExpenses: projectExpenses || [],
        projectCategories: projectCategories || [],
        settings: {
            estimatedIncome: storedIncome,
            wealthParams: storedWealth ? JSON.parse(storedWealth) : null,
            defaultSalary: localStorage.getItem(SALARY_DEFAULT_KEY) ? JSON.parse(localStorage.getItem(SALARY_DEFAULT_KEY)) : null,
            appIdentity: localStorage.getItem(APP_IDENTITY_KEY) ? JSON.parse(localStorage.getItem(APP_IDENTITY_KEY)) : null,
            theme: localStorage.getItem(THEME_KEY) || 'light'
        },
        wealthHoldings: typeof wealthHoldings !== 'undefined' ? wealthHoldings : [],
        wealthBankAccounts: typeof wealthBankAccounts !== 'undefined' ? wealthBankAccounts : []
    };
}

// Upload current state to Supabase matching `user_backups` table schema
async function syncToServer(force = false) {
    if (!currentUser) return; // Only sync if logged in (Offline mode fallback)
    if (isFetchingFromServer) return; // Never overwrite cloud while we're downloading from it

    // Prevent spamming the server
    const now = Date.now();
    if (!force && now - lastSyncTime < 2000) return;
    lastSyncTime = now;

    const exportData = exportStateAsJSON();

    const { error } = await supabaseClient
        .from('user_backups')
        .upsert({
            user_id: currentUser.id,
            app_data: exportData,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('雲端同步失敗:', error.message);
        // showToast('雲端同步失敗', 'error'); // Optional
    } else {
        console.log('雲端同步成功', new Date().toLocaleTimeString());
    }
}

// Debounced version for frequent local saves
let syncTimeout = null;
function triggerCloudSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncToServer();
    }, 1500); // Wait 1.5 seconds of inactivity before syncing
}

// Download state from Supabase and overwrite localStorage
async function fetchFromServer() {
    if (!currentUser) return;

    // Block any pending local→cloud sync so it can't overwrite cloud before we download
    isFetchingFromServer = true;
    if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }

    const loadingOverlay = document.getElementById('syncLoading');
    if (loadingOverlay) loadingOverlay.classList.add('active');

    try {
        const { data, error } = await supabaseClient
            .from('user_backups')
            .select('app_data, updated_at')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('讀取雲端資料失敗:', error.message);
            showToast('讀取雲端資料失敗');
            return;
        }

        if (data && data.app_data) {
            const cloudTimestamp = new Date(data.updated_at).getTime();
            const localTimestampRaw = localStorage.getItem('last_local_update');
            const localTimestamp = localTimestampRaw ? parseInt(localTimestampRaw, 10) : 0;

            // Conflict Resolution:
            // Local wins only if: it has real user data AND its timestamp is strictly newer than cloud.
            // lifeExpenses > 1 (exclude the single auto-applied salary stub) counts as real data.
            var localHasRealData = (items && items.length > 0) ||
                                   (projects && projects.length > 0) ||
                                   (lifeExpenses && lifeExpenses.length > 1);

            if (localHasRealData && localTimestamp > 0 && localTimestamp > cloudTimestamp) {
                console.log('本地資料較新，將本地資料推上雲端覆蓋', { localTimestamp, cloudTimestamp });
                if (loadingOverlay) loadingOverlay.classList.remove('active');
                isFetchingFromServer = false; // Allow sync before returning
                await syncToServer(true); // Force push local to cloud
                return;
            }

            const appData = data.app_data;
            // Overwrite JS variables & LocalStorage
            items = appData.items || [];
            categories = appData.categories || DEFAULT_CATS;
            lifeExpenses = appData.lifeExpenses || [];
            lifeCategories = appData.lifeCategories || DEFAULT_LIFE_CATS;
            lifeIncomeCategories = appData.lifeIncomeCategories || DEFAULT_LIFE_INC_CATS;
            lifeBudgets = appData.lifeBudgets || {};
            projects = appData.projects || [];
            projectExpenses = appData.projectExpenses || [];

            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            localStorage.setItem(CAT_KEY, JSON.stringify(categories));
            localStorage.setItem(LIFE_EXP_KEY, JSON.stringify(lifeExpenses));
            localStorage.setItem(LIFE_CAT_KEY, JSON.stringify(lifeCategories));
            localStorage.setItem(LIFE_INC_CAT_KEY, JSON.stringify(lifeIncomeCategories));
            localStorage.setItem(LIFE_BDG_KEY, JSON.stringify(lifeBudgets));
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
            localStorage.setItem(PROJECT_EXP_KEY, JSON.stringify(projectExpenses));

            if (appData.projectCategories) {
                projectCategories = appData.projectCategories;
                localStorage.setItem(PROJECT_CAT_KEY, JSON.stringify(projectCategories));
            }

            if (appData.settings) {
                if (appData.settings.estimatedIncome !== undefined) {
                    localStorage.setItem(INCOME_KEY, appData.settings.estimatedIncome);
                    const incInput = document.getElementById('monthlyIncomeInput');
                    if (incInput) incInput.value = appData.settings.estimatedIncome;
                }
                if (appData.settings.wealthParams) {
                    localStorage.setItem(WEALTH_PARAMS_KEY, JSON.stringify(appData.settings.wealthParams));
                }
                if (appData.settings.defaultSalary) {
                    localStorage.setItem(SALARY_DEFAULT_KEY, JSON.stringify(appData.settings.defaultSalary));
                }
                if (appData.settings.appIdentity) {
                    localStorage.setItem(APP_IDENTITY_KEY, JSON.stringify(appData.settings.appIdentity));
                }
                if (appData.settings.theme) {
                    localStorage.setItem(THEME_KEY, appData.settings.theme);
                }
            }

            if (appData.wealthHoldings) {
                if (typeof wealthHoldings !== 'undefined') wealthHoldings = appData.wealthHoldings;
                localStorage.setItem(WEALTH_HOLDINGS_KEY, JSON.stringify(appData.wealthHoldings));
            }
            if (appData.wealthBankAccounts) {
                if (typeof wealthBankAccounts !== 'undefined') wealthBankAccounts = appData.wealthBankAccounts;
                localStorage.setItem(WEALTH_BANKS_KEY, JSON.stringify(appData.wealthBankAccounts));
            }
            // showToast('已載入雲端最新資料'); // Removed per request

            // Refresh all UI — use init(true) to ensure every tab renders correctly
            init(true); // skipCloudFetch=true prevents infinite re-fetch loop
            // showToast('已載入雲端最新資料'); // Removed to reduce notification clutter

        } else {
            // First log in, no cloud data. Push current local data to cloud to initialize.
            console.log('首次登入，將本地資料同步至雲端...');
            isFetchingFromServer = false; // Release guard so upload is allowed
            await syncToServer(true);
        }
    } catch (err) {
        console.error('Fetch error:', err);
    } finally {
        isFetchingFromServer = false;
        if (loadingOverlay) loadingOverlay.classList.remove('active');
    }
}

// Modal UI Controls
function openAuthModal() {
    document.getElementById('authModalOverlay').classList.add('active');

    // 每次開啟都從登入模式開始
    switchAuthMode('login');

    // 延遲一幀後再填入，確保 modal 已完全渲染（mobile 尤其需要）
    requestAnimationFrame(() => {
        const lastEmail = localStorage.getItem('last_login_email');
        const emailInput = document.getElementById('authEmail');
        if (lastEmail && emailInput) {
            emailInput.value = lastEmail;
            // 觸發 input 事件讓瀏覽器密碼管理器感知
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            const pwdInput = document.getElementById('authPassword');
            if (pwdInput) pwdInput.focus();
        } else if (emailInput) {
            emailInput.focus();
        }
    });
}
function closeAuthModal() {
    document.getElementById('authModalOverlay').classList.remove('active');
}

// Initial check on load
// WE DO NOT auto-run checkSession here anymore.
// It is explicitly called at the end of `init()` in main.js to prevent race conditions
// with data.js initializing defaults.
