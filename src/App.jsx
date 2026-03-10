import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { useSync } from './hooks/useSync';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import LifeTab     from './components/tabs/LifeTab';
import FixedTab    from './components/tabs/FixedTab';
import AnalysisTab from './components/tabs/AnalysisTab';
import AnnualTab   from './components/tabs/AnnualTab';
import WealthTab   from './components/tabs/WealthTab';
import ProjectsTab from './components/tabs/ProjectsTab';

// Global CSS (既有模組全部沿用)
import '../css/main.css';
// React-specific overrides (patch Vanilla JS CSS assumptions)
import './overrides.css';

const TAB_MAP = {
  life:     <LifeTab />,
  fixed:    <FixedTab />,
  analysis: <AnalysisTab />,
  annual:   <AnnualTab />,
  wealth:   <WealthTab />,
  projects: <ProjectsTab />,
};

export default function App() {
  const { activeTab, theme } = useAppStore();
  useSync(); // 初始化 auth + 雲端同步

  // 套用 theme
  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, [theme]);

  // 切換分頁時捲回頂部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  return (
    <div className="container">
      <Header />
      <main>
        {TAB_MAP[activeTab]}
      </main>
      <BottomNav />
    </div>
  );
}
