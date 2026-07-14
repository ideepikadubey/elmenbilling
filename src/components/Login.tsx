import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import elmenLogo from '../assets/elmen-logo-white.png';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    // Simulate network authentication
    setTimeout(() => {
      if (username === 'admin5111' && password === 'elmen@5111') {
        sessionStorage.setItem('elmen_auth', 'true');
        onLoginSuccess();
      } else {
        setError('Invalid username or password.');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-elmen-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-elmen-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-elmen-orange/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-elmen-gray/60 shadow-card rounded-3xl p-8 space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src={elmenLogo}
              alt="Elmen Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-elmen-text">Admin Portal Login</h2>
            <p className="text-xs text-elmen-muted">Enter administrative credentials to gain access</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold animate-fade-in">
            <ShieldCheck size={16} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="glass-label">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-elmen-muted">
                <User size={16} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input w-full !pl-10 text-sm font-semibold"
                placeholder=" admin"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="glass-label">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-elmen-muted">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full !pl-10 !pr-10 text-sm font-semibold"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-elmen-muted hover:text-elmen-text transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-elmen-orange hover:bg-elmen-orange-hover text-white font-bold text-sm rounded-xl transition-all shadow-premium-glow"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Verifying...
              </>
            ) : (
              'Access Admin Portal'
            )}
          </button>
        </form>


      </div>
    </div>
  );
};
