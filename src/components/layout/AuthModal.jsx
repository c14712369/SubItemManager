import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { showToast } from '../../lib/utils';

function checkStrength(pwd) {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { pct: '20%', color: '#ef4444', text: '非常弱' },
    { pct: '40%', color: '#f97316', text: '弱' },
    { pct: '60%', color: '#eab308', text: '中等' },
    { pct: '80%', color: '#22c55e', text: '強' },
    { pct: '100%', color: '#10b981', text: '非常強' },
  ];
  return levels[Math.min(score, 4)];
}

export default function AuthModal({ onClose }) {
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState(localStorage.getItem('last_login_email') || '');
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const switchMode = (m) => {
    setMode(m); setPassword(''); setStrength(null);
  };

  const handlePwd = (v) => {
    setPassword(v);
    if (mode === 'register') setStrength(checkStrength(v));
    else setStrength(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        if (password.length < 8) {
          alert('密碼至少需要 8 個字元，建議包含大小寫英文、數字及特殊符號。');
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) { alert('註冊失敗：' + error.message); return; }
        alert('註冊成功！請檢查您的信箱以驗證帳號，或直接登入（視 Supabase 設定而定）。');
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            alert('帳號或密碼錯誤，請確認後再試。\n\n尚未有帳號？請切換至「註冊」頁面。');
          } else {
            alert('登入發生錯誤：' + error.message);
          }
          return;
        }
        localStorage.setItem('last_login_email', email);
        showToast('登入成功');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span id="authModalTitle">{mode === 'login' ? '登入' : '註冊新帳號'}</span>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="auth-tabs">
          <button type="button" id="authTabLogin"
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}>登入</button>
          <button type="button" id="authTabRegister"
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}>註冊</button>
        </div>

        <form id="authForm" onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label className="form-label">Email 信箱</label>
            <input type="email" id="authEmail" className="form-input" required
              placeholder="your@email.com" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">密碼</label>
            <input type="password" id="authPassword" className="form-input" required
              placeholder="請輸入密碼"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password} onChange={e => handlePwd(e.target.value)} />
            {mode === 'register' && strength && (
              <div id="passwordStrengthBar" style={{ marginTop: 6 }}>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border-color)', overflow: 'hidden' }}>
                  <div id="passwordStrengthFill"
                    style={{ height: '100%', width: strength.pct, background: strength.color, transition: 'width 0.3s, background 0.3s' }}></div>
                </div>
                <div id="passwordStrengthLabel"
                  style={{ fontSize: '0.75rem', marginTop: 4, color: strength.color }}>
                  密碼強度：{strength.text}
                </div>
              </div>
            )}
          </div>
          <button type="submit" id="authSubmitBtn" className="btn btn-primary"
            style={{ width: '100%', marginTop: 10 }} disabled={loading}>
            {loading ? '處理中...' : (mode === 'login' ? '登入' : '建立帳號')}
          </button>
        </form>
      </div>
    </div>
  );
}
