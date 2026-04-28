import { useState, useEffect } from 'react';
import './index.css';
import ParticleBackground from './components/ParticleBackground';
import Navbar from './components/Navbar';
import UrlShortener from './components/UrlShortener';
import RecentLinks from './components/RecentLinks';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [totalLinks, setTotalLinks] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/urls/recent`);
      const data = await res.json();
      if (data.success && data.data) {
        setTotalLinks(data.data.length);
        const clicks = data.data.reduce((sum, item) => sum + (item.clicks || 0), 0);
        setTotalClicks(clicks);
      }
    } catch {
      // Backend not running — not critical
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const handleShorten = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="app">
      {/* Ambient glow orbs */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      {/* Interactive particle background */}
      <ParticleBackground />

      {/* Navigation */}
      <Navbar totalLinks={totalLinks} totalClicks={totalClicks} />

      {/* Main content */}
      <main className="main-content">
        {/* Hero */}
        <section className="hero">
          <h1 className="hero-title">SnipLink</h1>
          <p className="hero-tagline">Shorten · Share · Track</p>
        </section>

        {/* URL Shortener */}
        <UrlShortener onShorten={handleShorten} />

        {/* Recent Links */}
        <RecentLinks refreshTrigger={refreshTrigger} />
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          Built with ⚡ by <a href="https://github.com/isharoy8777" target="_blank" rel="noopener noreferrer">isharoy8777</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
