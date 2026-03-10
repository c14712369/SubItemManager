import { useAppStore } from '../../store/appStore';
import { TABS } from '../../lib/constants';

export default function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <i className={tab.icon}></i>
          <span>{tab.mobileLabel}</span>
        </button>
      ))}
    </nav>
  );
}
