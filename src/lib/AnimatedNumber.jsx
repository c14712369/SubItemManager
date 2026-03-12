import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Animated Number component
 * @param {string} effect - 'scroll' (count up), 'fade' (just opacity/blur), 'none'
 */
export default function AnimatedNumber({ value, format, duration = 700, effect = 'fade' }) {
  const [display, setDisplay] = useState(0);
  const prevValueRef = useRef(0);
  const wasHiddenRef = useRef(false);

  const isHiddenNow = format && format(value) === '****';

  useEffect(() => {
    if (isHiddenNow) {
      wasHiddenRef.current = true;
      return;
    }

    const revealed = wasHiddenRef.current;
    wasHiddenRef.current = false;

    // For non-scroll effects, we just snap to the target value immediately
    if (effect !== 'scroll') {
      setDisplay(value);
      prevValueRef.current = value;
      return;
    }

    const initial = revealed ? 0 : prevValueRef.current;
    const diff = value - initial;
    
    if (diff === 0 && !revealed) {
      setDisplay(value);
      return;
    }

    let start = null;
    let animationFrameId;

    const step = (ts) => {
      if (!start) start = ts;
      const p      = Math.min((ts - start) / duration, 1);
      const eased  = 1 - Math.pow(1 - p, 4); // easeOutQuart
      setDisplay(initial + diff * eased);
      
      if (p < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplay(value);
        prevValueRef.current = value;
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration, isHiddenNow, effect]); 

  const rounded = Math.round(display);
  const displayText = format ? format(rounded) : rounded.toLocaleString();

  // Animation variants for the container
  const variants = {
    initial: { opacity: 0, filter: 'blur(4px)', y: 2 },
    animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
    exit: { opacity: 0, filter: 'blur(2px)', y: -2 }
  };

  return (
    <AnimatePresence mode="wait">
      {isHiddenNow ? (
        <motion.span
          key="hidden-stars"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-block' }}
        >
          ****
        </motion.span>
      ) : (
        <motion.span
          key={`visible-${effect === 'scroll' ? 'scrolling' : value}`}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-block' }}
        >
          {displayText === '****' ? '0' : displayText}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
