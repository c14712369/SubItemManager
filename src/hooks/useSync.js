import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAppStore } from '../store/appStore';
import {
  STORAGE_KEY, CAT_KEY, LIFE_EXP_KEY, LIFE_CAT_KEY, LIFE_INC_CAT_KEY,
  LIFE_BDG_KEY, PROJECTS_KEY, PROJECT_EXP_KEY, PROJECT_CAT_KEY,
  INCOME_KEY, WEALTH_PARAMS_KEY, WEALTH_HOLDINGS_KEY, WEALTH_BANKS_KEY,
  SALARY_DEFAULT_KEY, DAILY_EXP_KEY, APP_IDENTITY_KEY, THEME_KEY,
} from '../lib/constants';

function exportState(store) {
  return {
    items:                store.items,
    categories:           store.categories,
    lifeExpenses:         store.lifeExpenses,
    lifeCategories:       store.lifeCategories,
    lifeIncomeCategories: store.lifeIncomeCategories,
    lifeBudgets:          store.lifeBudgets,
    projects:             store.projects,
    projectExpenses:      store.projectExpenses,
    projectCategories:    store.projectCategories,
    wealthHoldings:       store.wealthHoldings,
    wealthBankAccounts:   store.wealthBankAccounts,
    settings: {
      estimatedIncome: store.estimatedIncome,
      wealthParams:    store.wealthParams,
      defaultSalary:   JSON.parse(localStorage.getItem(SALARY_DEFAULT_KEY) || 'null'),
      dailyExpenses:   JSON.parse(localStorage.getItem(DAILY_EXP_KEY)      || '[]'),
      appIdentity:     JSON.parse(localStorage.getItem(APP_IDENTITY_KEY)   || 'null'),
      theme:           store.theme,
    },
  };
}

export function useSync() {
  const store = useAppStore();
  const { setCurrentUser, setIsSyncing, loadFromCloud } = store;
  const isFetching = useRef(false);
  const syncTimer  = useRef(null);
  const lastSync   = useRef(0);

  // ── push to Supabase ────────────────────────────────────────────────────
  const pushToCloud = useCallback(async (force = false) => {
    const user = useAppStore.getState().currentUser;
    if (!user || isFetching.current || !navigator.onLine) return;
    const now = Date.now();
    if (!force && now - lastSync.current < 2000) return;
    lastSync.current = now;

    try {
      const { error } = await supabase.from('user_backups').upsert({
        user_id:    user.id,
        app_data:   exportState(useAppStore.getState()),
        updated_at: new Date().toISOString(),
      });
      if (error) console.error('雲端同步失敗:', error.message);
      else console.log('雲端同步成功', new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Sync error:', e);
    }
  }, []);

  // ── debounced trigger ───────────────────────────────────────────────────
  const triggerSync = useCallback(() => {
    if (window._appInitializing) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => pushToCloud(), 1500);
  }, [pushToCloud]);

  // ── pull from Supabase ─────────────────────────────────────────────────
  const pullFromCloud = useCallback(async () => {
    const user = useAppStore.getState().currentUser;
    if (!user || !navigator.onLine) return;

    isFetching.current = true;
    window._appInitializing = true;
    if (syncTimer.current) { clearTimeout(syncTimer.current); syncTimer.current = null; }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('user_backups')
        .select('app_data, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('讀取雲端失敗:', error.message);
        return;
      }

      if (data?.app_data) {
        const cloudTs = new Date(data.updated_at).getTime();
        const localTs = parseInt(localStorage.getItem('last_local_update') || '0', 10);
        const s = useAppStore.getState();
        const localCount = (s.items?.length || 0) + (s.lifeExpenses?.length || 0) + (s.projects?.length || 0);
        const cloudData  = data.app_data;
        const cloudCount = (cloudData.items?.length || 0) + (cloudData.lifeExpenses?.length || 0) + (cloudData.projects?.length || 0);
        const localHasData  = localCount > 0;
        const cloudHasMore  = cloudCount > 5 && localCount < cloudCount * 0.5;

        if (localHasData && localTs > cloudTs && !cloudHasMore) {
          // 本地較新 → 推上去
          isFetching.current = false;
          window._appInitializing = false;
          await pushToCloud(true);
          return;
        }
        // 雲端較新或資料量更多 → 拉下來
        loadFromCloud(cloudData);
      } else {
        // 首次登入 → 推本地
        isFetching.current = false;
        window._appInitializing = false;
        await pushToCloud(true);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      isFetching.current = false;
      window._appInitializing = false;
      setIsSyncing(false);
    }
  }, [loadFromCloud, pushToCloud, setIsSyncing]);

  // ── auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    window._appInitializing = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) pullFromCloud();
      else { window._appInitializing = false; }
    }).catch(() => { window._appInitializing = false; });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (event === 'SIGNED_IN') pullFromCloud();
    });

    const handleOnline = () => { if (useAppStore.getState().currentUser) pullFromCloud(); };
    window.addEventListener('online', handleOnline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { triggerSync, pushToCloud, pullFromCloud };
}
