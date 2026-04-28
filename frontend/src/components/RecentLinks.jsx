import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
const SHORT_DOMAIN = import.meta.env.VITE_SHORT_DOMAIN || 'snipl.ink';

export default function RecentLinks({ refreshTrigger }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/urls/recent`);
      const data = await res.json();
      if (data.success) {
        setLinks(data.data);
      }
    } catch {
      // Silently fail — not critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, [refreshTrigger]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateUrl = (url, maxLen = 50) => {
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen) + '...';
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (links.length === 0) {
    return (
      <div className="recent-section">
        <div className="section-header">
          <h2 className="section-title">Recent Links</h2>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <p className="empty-text">No links shortened yet. Create your first one above!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-section">
      <div className="section-header">
        <h2 className="section-title">Recent Links</h2>
        <span className="section-badge">{links.length} link{links.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="recent-list">
        {links.map((link) => (
          <div className="recent-item" key={link.shortCode}>
            <div className="recent-url">
              <a
                href={link.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="recent-short"
              >
                {link.shortUrl.replace(/https?:\/\/[^\/]+\//, `${SHORT_DOMAIN}/`)}
              </a>
              <span className="recent-long" title={link.longUrl}>
                {truncateUrl(link.longUrl)}
              </span>
            </div>
            <span className="recent-clicks">
              👁 {link.clicks}
            </span>
            <span className="recent-date">{formatDate(link.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
