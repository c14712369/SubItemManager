import { useAppStore } from '../../store/appStore';
import { TABS } from '../../lib/constants';

export default function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  const handleTabClick = (id) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setActiveTab(id);
  };

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
        >
          <i className={tab.icon}></i>
          <span>{tab.mobileLabel}</span>
        </button>
      ))}
    </nav>
  );
}
