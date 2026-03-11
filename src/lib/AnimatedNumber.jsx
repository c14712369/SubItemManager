import { useState, useEffect } from 'react';

/**
 * 數字滾動元件。掛載時從 0 計數至 value，value 變動時再做差值動畫。
 * @param {number}   value    目標數值（整數）
 * @param {function} format   格式化函式，接收整數回傳字串，預設 toLocaleString
 * @param {number}   duration 動畫時長（ms），預設 700
 */
export default function AnimatedNumber({ value, format, duration = 700 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const initial = display;
    const diff = value - initial;
    if (diff === 0) return;

    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p      = Math.min((ts - start) / duration, 1);
      const eased  = 1 - Math.pow(1 - p, 4); // easeOutQuart
      setDisplay(initial + diff * eased);
      if (p < 1) requestAnimationFrame(step);
      else        setDisplay(value);
    };
    requestAnimationFrame(step);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const rounded = Math.round(display);
  return <>{format ? format(rounded) : rounded.toLocaleString()}</>;
}
