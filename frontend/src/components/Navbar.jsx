import { useState, useEffect, useRef } from 'react';

/**
 * Animated counter that counts up from 0 to the target number.
 */
function AnimatedCounter({ target, duration = 1500 }) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    const end = target;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * eased);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
    prevTarget.current = target;
  }, [target, duration]);

  const formatNumber = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  return <span>{formatNumber(count)}</span>;
}

export default function Navbar({ totalLinks, totalClicks }) {
  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand">
        <div className="navbar-logo">S</div>
        <span className="navbar-title">SnipLink</span>
      </a>
      <div className="navbar-stats">
        <div className="stat-item">
          <span className="stat-label">Total Links</span>
          <span className="stat-value">
            <AnimatedCounter target={totalLinks} />
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Clicks</span>
          <span className="stat-value">
            <AnimatedCounter target={totalClicks} />
          </span>
        </div>
      </div>
    </nav>
  );
}
