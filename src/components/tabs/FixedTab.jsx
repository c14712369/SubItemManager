import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { getCycleLabel, toMonthlyAmount, fetchWithCache, showToast } from '../../lib/utils';
import { DEFAULT_CATS } from '../../lib/constants';

const CYCLES = [
  { value: 'monthly',     label: '每月' },
  { value: 'bimonthly',   label: '每兩個月' },
  { value: 'quarterly',   label: '每季' },
  { value: 'half-yearly', label: '每半年' },
  { value: 'yearly',      label: '每年' },
  { value: 'daily',       label: '每日' },
  { value: 'weekly',      label: '每週' },
  { value: 'fixed',       label: '一次性' },
];

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'GBP', 'CNY', 'HKD', 'AUD', 'CAD', 'KRW', 'SGD'];

const EMPTY_FORM = {
  id: '', name: '', categoryId: '', currency: 'TWD',
  originalAmount: '', exchangeRate: 1, amount: 0,
  cycle: 'monthly', startDate: new Date().toISOString().split('T')[0],
  endDate: '', note: '',
};

// ── Item Modal ──────────────────────────────────────────────────────────────
function ItemModal({ categories, onClose, onSave, initial }) {
  const [form, setForm]     = useState(initial || EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [shake, setShake]   = useState(false);
  const isEdit = !!form.id;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const twdAmount = Math.round((parseFloat(form.originalAmount) || 0) * (parseFloat(form.exchangeRate) || 1));

  const handleCurrencyChange = useCallback(async (curr) => {
    set('currency', curr);
    if (curr === 'TWD') { set('exchangeRate', 1); return; }
    setLoading(true);
    try {
      const data = await fetchWithCache(`https://api.frankfurter.app/latest?from=${curr}&to=TWD`);
      if (data?.rates?.TWD) set('exchangeRate', parseFloat(data.rates.TWD.toFixed(4)));
    } catch { showToast('匯率抓取失敗，請手動輸入', 'error'); }
    finally { setLoading(false); }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !(parseFloat(form.originalAmount) > 0)) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      showToast('請填寫完整名稱與正確金額', 'error');
      return;
    }
    onSave({
      ...form,
      originalAmount: parseFloat(form.originalAmount),
      exchangeRate:   parseFloat(form.exchangeRate) || 1,
      amount:         twdAmount,
    });
  };

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${shake ? ' shake' : ''}`} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>{isEdit ? '編輯項目' : '新增項目'}</h3>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">名稱</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="訂閱名稱…" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">分類</label>
            <select className="form-select" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">幣別</label>
            <select className="form-select" value={form.currency} onChange={e => handleCurrencyChange(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">金額（{form.currency}）</label>
            <input className="form-input" type="number" min="0" step="any" value={form.originalAmount}
              onChange={e => set('originalAmount', e.target.value)} placeholder="0" />
          </div>
          {form.currency !== 'TWD' && (
            <div className="form-group" id="exchangeRateRow">
              <label className="form-label">匯率（1 {form.currency} = ? TWD）{loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> 抓取中…</span>}</label>
              <input className="form-input" type="number" min="0" step="any" value={form.exchangeRate}
                onChange={e => set('exchangeRate', e.target.value)} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                ≈ NT$ {twdAmount.toLocaleString()}
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">週期</label>
            <select className="form-select" value={form.cycle} onChange={e => set('cycle', e.target.value)}>
              {CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">開始日期</label>
            <input className="form-input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">結束日期（選填）</label>
            <input className="form-input" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">備註（選填）</label>
            <input className="form-input" value={form.note} onChange={e => set('note', e.target.value)} placeholder="備註…" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              <i className="fa-solid fa-check"></i> {isEdit ? '儲存' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Category Modal ──────────────────────────────────────────────────────────
function CategoryModal({ categories, onClose, onSave }) {
  const [cats, setCats]         = useState(categories);
  const [editId, setEditId]     = useState('');
  const [catName, setCatName]   = useState('');
  const [catColor, setCatColor] = useState('#4f46e5');
  const dragSrc = useRef(null);

  const handleSave = () => {
    if (!catName.trim()) return;
    if (editId) {
      setCats(prev => prev.map(c => c.id === editId ? { ...c, name: catName, color: catColor } : c));
    } else {
      setCats(prev => [...prev, { id: 'cat_' + Date.now(), name: catName, color: catColor }]);
    }
    setCatName(''); setCatColor('#4f46e5'); setEditId('');
  };

  const handleEdit = (cat) => { setEditId(cat.id); setCatName(cat.name); setCatColor(cat.color); };
  const handleDelete = (id) => {
    if (!confirm('刪除此分類？關聯的項目將變為「其他」。')) return;
    setCats(prev => prev.filter(c => c.id !== id));
    if (editId === id) { setCatName(''); setCatColor('#4f46e5'); setEditId(''); }
  };

  const handleDragStart = (e, idx) => { dragSrc.current = idx; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop      = (e, idx) => {
    e.preventDefault();
    const src = dragSrc.current;
    if (src == null || src === idx) return;
    setCats(prev => {
      const next = [...prev];
      const [item] = next.splice(src, 1);
      next.splice(idx, 0, item);
      return next;
    });
    dragSrc.current = null;
  };

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>管理分類</h3>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div id="categoryList" style={{ marginBottom: 16 }}>
          {cats.map((cat, idx) => (
            <div key={cat.id} className="category-item" draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, idx)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-grip-lines handle" style={{ color: 'var(--text-muted)', marginRight: 10, cursor: 'grab' }}></i>
                <div className="color-dot" style={{ background: cat.color }}></div>
                <span>{cat.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button className="icon-btn" onClick={() => handleEdit(cat)}><i className="fa-solid fa-pen"></i></button>
                {!DEFAULT_CATS.find(d => d.id === cat.id) && (
                  <button className="icon-btn delete" onClick={() => handleDelete(cat.id)}><i className="fa-solid fa-trash"></i></button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
          <input className="form-input" style={{ flex: 1 }} value={catName} onChange={e => setCatName(e.target.value)}
            placeholder="分類名稱…" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSave())} />
          <button className="icon-btn" onClick={handleSave}>
            <i className={`fa-solid ${editId ? 'fa-check' : 'fa-plus'}`}></i>
          </button>
          {editId && (
            <button className="icon-btn" onClick={() => { setEditId(''); setCatName(''); setCatColor('#4f46e5'); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>取消</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => { onSave(cats); onClose(); }}>
            <i className="fa-solid fa-check"></i> 儲存分類
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main FixedTab ───────────────────────────────────────────────────────────
export default function FixedTab() {
  const {
    items, categories, fixedSortMode,
    addItem, updateItem, deleteItem,
    setCategories, setFixedSortMode,
  } = useAppStore();

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalItem, setModalItem]   = useState(null);   // null=closed, {}=new, item=edit
  const [showCatModal, setCatModal] = useState(false);

  const now = new Date(); now.setHours(0, 0, 0, 0);

  // ── Filter + Sort ──
  const filtered = items
    .filter(item => {
      const q = search.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !(item.note || '').toLowerCase().includes(q)) return false;
      const ended = item.endDate && new Date(item.endDate) < now;
      if (statusFilter === 'active' && ended) return false;
      if (statusFilter === 'ended'  && !ended) return false;
      return true;
    })
    .sort((a, b) => {
      if (fixedSortMode === 'amount-desc') return b.amount - a.amount;
      if (fixedSortMode === 'amount-asc')  return a.amount - b.amount;
      if (fixedSortMode === 'date-desc')   return new Date(b.startDate) - new Date(a.startDate);
      const ai = categories.findIndex(c => c.id === a.categoryId);
      const bi = categories.findIndex(c => c.id === b.categoryId);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  // ── Totals ──
  const activeItems = items.filter(i => !(i.endDate && new Date(i.endDate) < now));
  const totalMonthly = activeItems.reduce((s, i) => s + toMonthlyAmount(i), 0);

  // ── Summary by category ──
  const catMap = {};
  activeItems.forEach(item => {
    const cat = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1];
    if (!catMap[cat.id]) catMap[cat.id] = { name: cat.name, color: cat.color, monthly: 0 };
    catMap[cat.id].monthly += toMonthlyAmount(item);
  });
  const summaryRows = Object.values(catMap).sort((a, b) => b.monthly - a.monthly);

  // ── Handlers ──
  const handleSaveItem = (data) => {
    if (data.id) {
      updateItem(data.id, data);
      showToast('更新成功');
    } else {
      addItem({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
      showToast('新增成功');
    }
    setModalItem(null);
  };

  const handleDelete = (id) => {
    if (!confirm('確定刪除？')) return;
    deleteItem(id);
    showToast('刪除成功');
  };

  const handleSaveCategories = (cats) => {
    const reassigned = items.map(i => cats.find(c => c.id === i.categoryId) ? i : { ...i, categoryId: 'cat_other' });
    if (reassigned.some((item, idx) => item.categoryId !== items[idx]?.categoryId)) {
      useAppStore.getState().setItems(reassigned);
    }
    setCategories(cats);
    showToast('分類已儲存');
  };

  const openEdit = (item) => {
    setModalItem({
      id: item.id, name: item.name,
      categoryId: item.categoryId,
      currency: item.currency || 'TWD',
      originalAmount: String(item.originalAmount || item.amount),
      exchangeRate: item.exchangeRate || 1,
      amount: item.amount,
      cycle: item.cycle,
      startDate: item.startDate,
      endDate: item.endDate || '',
      note: item.note || '',
    });
  };

  return (
    <div className="tab-content">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-filter">
          <input className="form-input" placeholder="搜尋名稱或備註…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="all">全部</option>
            <option value="active">進行中</option>
            <option value="ended">已結束</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ width: 'auto' }} value={fixedSortMode} onChange={e => setFixedSortMode(e.target.value)}>
            <option value="category">依分類</option>
            <option value="amount-desc">金額高→低</option>
            <option value="amount-asc">金額低→高</option>
            <option value="date-desc">最新在上</option>
          </select>
          <button className="icon-btn" title="管理分類" onClick={() => setCatModal(true)}>
            <i className="fa-solid fa-tags"></i>
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="fixed-layout">
        <div className="fixed-list-col">
        <div className="fixed-list" id="itemsList">
          {filtered.length === 0 ? (
            <div className="empty-state"><h3>沒有相符項目</h3></div>
          ) : (
            filtered.map(item => {
              const cat   = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1];
              const ended = item.endDate && new Date(item.endDate) < now;
              const dateRange = item.endDate ? `${item.startDate} ~ ${item.endDate}` : item.startDate;
              return (
                <div key={item.id} className={`item-row${ended ? ' item-row--ended' : ''}`} style={{ '--cat-color': cat.color + '14' }}>
                  <div className="item-row-bar" style={{ background: cat.color }}></div>
                  <div className="item-row-main">
                    <div className="item-row-name">
                      {item.name}
                      {ended && <span className="item-row-badge item-row-badge--ended">已結束</span>}
                    </div>
                    <div className="item-row-tags">
                      <span className="item-row-cat" style={{ background: cat.color + '20', color: cat.color }}>{cat.name}</span>
                      <span className="item-row-cycle">{getCycleLabel(item.cycle)}</span>
                    </div>
                    <div className="item-row-date">
                      <i className="fa-regular fa-calendar" style={{ marginRight: 3 }}></i>{dateRange}
                    </div>
                    {item.note && <div className="item-row-note"><i className="fa-regular fa-comment"></i> {item.note}</div>}
                  </div>
                  <div className="item-row-amount">
                    {item.currency && item.currency !== 'TWD'
                      ? <>{item.currency} {(item.originalAmount || 0).toLocaleString()} <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>(≈NT${item.amount.toLocaleString()})</span></>
                      : <>NT$ {(item.amount || 0).toLocaleString()}</>
                    }
                  </div>
                  <div className="item-row-actions">
                    <button className="icon-btn" title="編輯" onClick={() => openEdit(item)}><i className="fa-solid fa-pen"></i></button>
                    <button className="icon-btn delete" title="刪除" onClick={() => handleDelete(item.id)}><i className="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>

        {/* Summary sidebar */}
        {summaryRows.length > 0 && (
          <div className="fixed-summary-col">
            <div className="fixed-summary-panel chart-section" style={{ padding: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-chart-pie" style={{ color: 'var(--primary-color)' }}></i> 支出彙總
              </h3>
              <div id="fixedSummaryContent">
                {summaryRows.map(c => (
                  <div key={c.name} className="fixed-summary-row">
                    <span className="fixed-summary-dot" style={{ background: c.color }}></span>
                    <span className="fixed-summary-name">{c.name}</span>
                    <span className="fixed-summary-amount">NT$ {Math.round(c.monthly).toLocaleString()}</span>
                  </div>
                ))}
                <div className="fixed-summary-total">
                  <span>每月合計</span>
                  <span>NT$ {Math.round(totalMonthly).toLocaleString()}</span>
                </div>
                <div className="fixed-summary-yearly">每年估計 NT$ {Math.round(totalMonthly * 12).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setModalItem({ ...EMPTY_FORM, categoryId: categories[0]?.id || '' })}>
        <i className="fa-solid fa-plus"></i>
      </button>

      {/* Modals */}
      {modalItem !== null && (
        <ItemModal
          categories={categories}
          initial={modalItem.id ? modalItem : { ...EMPTY_FORM, categoryId: categories[0]?.id || '' }}
          onClose={() => setModalItem(null)}
          onSave={handleSaveItem}
        />
      )}
      {showCatModal && (
        <CategoryModal
          categories={categories}
          onClose={() => setCatModal(false)}
          onSave={handleSaveCategories}
        />
      )}
    </div>
  );
}
