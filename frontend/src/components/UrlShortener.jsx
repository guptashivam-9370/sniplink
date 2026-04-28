import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
const SHORT_DOMAIN = import.meta.env.VITE_SHORT_DOMAIN || 'snipl.ink';

export default function UrlShortener({ onShorten }) {
  const [longUrl, setLongUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setCopied(false);

    if (!longUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl: longUrl.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setResult(data.data);
      if (onShorten) onShorten(data.data);
    } catch (err) {
      setError('Failed to connect to the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = result.shortUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-card">
      <form className="url-form" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <span className="input-icon">🔗</span>
          <input
            type="text"
            className="url-input"
            placeholder="Paste your long URL here..."
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            disabled={loading}
            id="url-input"
          />
        </div>
        <button type="submit" className="submit-btn" disabled={loading} id="shorten-btn">
          <span className="btn-content">
            {loading ? (
              <>
                <span className="spinner" />
                Shortening...
              </>
            ) : (
              <>✨ Shorten URL</>
            )}
          </span>
        </button>
      </form>

      {error && (
        <div className="error-message" role="alert">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="result-card">
          <div className="result-label">
            {result.isExisting ? '🔄 Existing Short URL' : '🎉 Your New Short URL'}
          </div>
          <div className="result-url-row">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="result-short-url"
            >
              {result.shortUrl.replace(/https?:\/\/[^\/]+\//, `${SHORT_DOMAIN}/`)}
            </a>
            <button
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              id="copy-btn"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="result-meta">
            <span className="result-original" title={result.longUrl}>
              → {result.longUrl}
            </span>
            <span className="click-badge">
              👁 {result.clicks} click{result.clicks !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
