import { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { useAppStore } from '../../store/appStore';
import { formatAmount, prefetchFXRates, calculateExpenseForMonth } from '../../lib/utils';
import AnimatedNumber from '../../lib/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';

Chart.register(...registerables);

function getYears(items, lifeExpenses, projects) {
  const years = new Set([String(new Date().getFullYear())]);
  items.forEach(i => { if (i.startDate) years.add(i.startDate.slice(0, 4)); if (i.endDate) years.add(i.endDate.slice(0, 4)); });
  lifeExpenses.forEach(e => { if (e.date) years.add(e.date.slice(0, 4)); });
  projects.forEach(p => (p.expenses || []).forEach(e => { if (e.date) years.add(e.date.slice(0, 4)); }));
  return Array.from(years).sort().reverse();
}

export default function AnnualTab() {
  const { items, lifeExpenses, projects, estimatedIncome } = useAppStore();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const years = getYears(items, lifeExpenses, projects);

  const barRef   = useRef(null);
  const pieRef   = useRef(null);
  const barChart = useRef(null);
  const pieChart = useRef(null);

  const [totals,  setTotals]  = useState({ income: 0, expense: 0, balance: 0 });
  const [monthly, setMonthly] = useState([]);

  const compute = useCallback(async () => {
    const yearInt = parseInt(year);
    const pairs   = Array.from({ length: 12 }, (_, i) => [yearInt, i + 1]);
    await prefetchFXRates(items, pairs);

    let totalIncome = 0, totalFixed = 0, totalLife = 0, totalProject = 0;
    const md = Array.from({ length: 12 }, () => ({ income: 0, fixed: 0, life: 0, project: 0, balance: 0 }));
    const estInc = parseFloat(estimatedIncome) || 0;

    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, '0')}`;
      let fixedExp = 0;
      for (const item of items) fixedExp += calculateExpenseForMonth(item, yearInt, m);
      md[m - 1].fixed = Math.round(fixedExp);
      totalFixed += Math.round(fixedExp);

      let lifeExp = 0, lifeInc = 0;
      lifeExpenses.forEach(e => {
        if (!(e.date || '').startsWith(ym)) return;
        if (e.type === 'income') lifeInc += Number(e.amount) || 0;
        else lifeExp += Number(e.amount) || 0;
      });
      md[m - 1].life = lifeExp;
      totalLife += lifeExp;

      const finalInc = lifeInc > 0 ? lifeInc : estInc;
      md[m - 1].income = finalInc;
      totalIncome += finalInc;

      let projExp = 0;
      projects.forEach(p => (p.expenses || []).forEach(e => { if ((e.date || '').startsWith(ym)) projExp += Number(e.amount) || 0; }));
      md[m - 1].project = projExp;
      totalProject += projExp;

      md[m - 1].balance = finalInc - (md[m - 1].fixed + lifeExp + projExp);
    }

    const totalExp = totalFixed + totalLife + totalProject;
    setTotals({ income: totalIncome, expense: totalExp, balance: totalIncome - totalExp });
    setMonthly(md);
  }, [year, items, lifeExpenses, projects, estimatedIncome]);

  useEffect(() => { compute(); }, [compute]);

  // ── Bar Chart ──
  useEffect(() => {
    if (!barRef.current || !monthly.length) return;
    const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F0EDE8' : '#1A1A1A';
    const gridColor = isDark ? '#2D2B28' : '#E8E5E0';
    const labels    = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

    barChart.current?.destroy();
    barChart.current = new Chart(barRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '收入',     data: monthly.map(d => d.income),  borderColor: '#3D7A5A', backgroundColor: '#3D7A5A18', borderWidth: 2, pointRadius: 4, tension: 0.3, fill: true },
          { label: '固定支出', data: monthly.map(d => d.fixed),   borderColor: '#2A6475', backgroundColor: '#2A647518', borderWidth: 2, pointRadius: 4, tension: 0.3, fill: true },
          { label: '生活花費', data: monthly.map(d => d.life),    borderColor: '#C17B2E', backgroundColor: '#C17B2E18', borderWidth: 2, pointRadius: 4, tension: 0.3, fill: true },
          { label: '企劃支出', data: monthly.map(d => d.project), borderColor: '#8b5cf6', backgroundColor: '#8b5cf618', borderWidth: 2, pointRadius: 4, tension: 0.3, fill: true },
          { label: '總結餘',   data: monthly.map(d => d.balance), borderColor: '#10b981', backgroundColor: '#10b98118', borderWidth: 3, pointRadius: 5, tension: 0.3, fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: NT$ ${Math.round(ctx.raw).toLocaleString()}` } },
        },
        scales: {
          x: { ticks: { color: textColor, maxRotation: 0 }, grid: { display: false } },
          y: { ticks: { color: textColor, callback: v => 'NT$' + v.toLocaleString() }, grid: { color: gridColor } },
        },
      },
    });
  }, [monthly]);

  // ── Pie Chart ──
  useEffect(() => {
    if (!pieRef.current || !monthly.length) return;
    const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F0EDE8' : '#1A1A1A';
    const totalFixed   = monthly.reduce((s, d) => s + d.fixed,   0);
    const totalLife    = monthly.reduce((s, d) => s + d.life,    0);
    const totalProject = monthly.reduce((s, d) => s + d.project, 0);

    pieChart.current?.destroy();
    pieChart.current = new Chart(pieRef.current, {
      type: 'doughnut',
      data: {
        labels: ['固定支出', '生活花費', '企劃支出'],
        datasets: [{ data: [totalFixed, totalLife, totalProject], backgroundColor: ['#2A6475', '#C17B2E', '#8b5cf6'], borderWidth: 2, borderColor: isDark ? '#1A1917' : '#fff' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, padding: 20 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                return ` NT$ ${ctx.raw.toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }, [monthly]);

  // cleanup on unmount
  useEffect(() => () => { barChart.current?.destroy(); pieChart.current?.destroy(); }, []);

  const prevYear = () => { const i = years.indexOf(year); if (i < years.length - 1) setYear(years[i + 1]); };
  const nextYear = () => { const i = years.indexOf(year); if (i > 0) setYear(years[i - 1]); };

  return (
    <div className="tab-content">
      <div className="header-title" style={{ marginBottom: 24, paddingTop: 10 }}>
        <h2><i className="fa-solid fa-calendar-days" style={{ color: 'var(--primary-color)', marginRight: 8 }}></i>年度總結報表</h2>
        <div className="subtitle">整合生活費、固定支出與企劃的年度花費</div>
      </div>

      {/* Bar chart + year nav + totals */}
      <div className="chart-section" style={{ marginBottom: 24 }}>
        <div className="chart-header" style={{ alignItems: 'center' }}>
          <h3><i className="fa-solid fa-chart-bar"></i> 全年度各月收支總覽</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="icon-btn" onClick={prevYear} title="上一年"><i className="fa-solid fa-chevron-left"></i></button>
            <select id="annualReportYear" className="form-select chart-select" value={year} onChange={e => setYear(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y} 年</option>)}
            </select>
            <button className="icon-btn" onClick={nextYear} title="下一年"><i className="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>

        <div className="dashboard" style={{ marginBottom: 16 }}>
          <AnimatePresence mode="popLayout">
            <motion.div 
              key="annual-income"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="stat-card" style={{ padding: 16 }}
            >
              <div className="stat-title">年度總收入</div>
              <div className="stat-value stat-positive" id="annualTotalIncome">NT$ <AnimatedNumber value={Math.round(totals.income)} format={v => formatAmount(v, 'income')} /></div>
            </motion.div>
            <motion.div 
              key="annual-expense"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="stat-card" style={{ padding: 16 }}
            >
              <div className="stat-title">年度總支出</div>
              <div className="stat-value stat-negative" id="annualTotalExpense">NT$ <AnimatedNumber value={Math.round(totals.expense)} /></div>
            </motion.div>
            <motion.div 
              key="annual-balance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="stat-card" style={{ padding: 16 }}
            >
              <div className="stat-title">年度總結餘</div>
              <div className={`stat-value${totals.balance >= 0 ? ' stat-positive' : ' stat-negative'}`} id="annualTotalBalance">
                NT$ <AnimatedNumber value={Math.abs(Math.round(totals.balance))} format={v => formatAmount(v, 'income')} />{totals.balance < 0 ? ' (負)' : ''}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="chart-container" style={{ height: 350, overflowX: 'auto', overflowY: 'hidden' }}>
          <div id="annualReportChartInner" style={{ height: '100%' }}>
            <canvas ref={barRef}></canvas>
          </div>
        </div>
      </div>

      {/* Pie chart */}
      <div className="chart-section" style={{ marginBottom: 24 }}>
        <div className="chart-header">
          <div className="chart-header-title">
            <h3><i className="fa-solid fa-chart-pie"></i> 年度支出分佈</h3>
          </div>
        </div>
        <div className="chart-container" style={{ height: 300 }}>
          <canvas ref={pieRef}></canvas>
        </div>
      </div>
    </div>
  );
}
