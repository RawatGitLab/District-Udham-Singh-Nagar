import React, { useState } from "react";
import { Compass, User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Environment variable credentials with fallback as requested
  const metaEnv = (import.meta as any).env || {};
  const validUsername = metaEnv.VITE_APP_USERNAME;
  const validPassword = metaEnv.VITE_APP_PASSWORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      if (
        username.trim() === validUsername.trim() &&
        password.trim() === validPassword.trim()
      ) {
        localStorage.setItem("is_authenticated", "true");
        onLoginSuccess();
      } else {
        setError("Invalid username or password. Please check your credentials.");
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 dark:bg-black/50 p-4 transition-all duration-300 pointer-events-auto">
      {/* Translucent Frosted Glass Card matching the theme styling */}
      <div className="w-full max-w-md bg-white/40 dark:bg-slate-900/70 backdrop-blur-md border border-white/50 dark:border-slate-700/60 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Subtle decorative glow effect inside card */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-400/20 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-400/20 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col items-center">
          {/* Top Circular Icon Badge */}
          <div className="w-16 h-16 rounded-full bg-indigo-100/70 dark:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center mb-4 shadow-sm backdrop-blur-sm">
            <Compass className="w-8 h-8 text-indigo-600 dark:text-indigo-400 stroke-[2]" />
          </div>

          {/* Header Title */}
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight text-center mb-1">
            Udham Singh Nagar Geoportal
          </h1>

          {/* Subtitle Description */}
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center leading-relaxed max-w-xs mb-6">
            Authorized Access Only. Please sign in to explore interactive district maps & planners.
          </p>

          {/* Error Message if present */}
          {error && (
            <div className="w-full mb-4 p-3 rounded-xl bg-red-50/80 dark:bg-red-950/70 border border-red-200/80 dark:border-red-900/70 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Input Fields Container */}
          <div className="w-full space-y-4 mb-6">
            {/* Username Field */}
            <div className="flex flex-col text-left">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                USERNAME
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-200/50 dark:bg-slate-800/60 focus:bg-white/80 dark:focus:bg-slate-800 border border-slate-300/60 dark:border-slate-700/80 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col text-left">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                PASSWORD
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-200/50 dark:bg-slate-800/60 focus:bg-white/80 dark:focus:bg-slate-800 border border-slate-300/60 dark:border-slate-700/80 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/30 dark:shadow-indigo-900/40 hover:shadow-indigo-600/40 transition-all duration-200 text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Explore Geoportal"
            )}
          </button>

          {/* Divider */}
          <div className="w-full my-6 border-t border-slate-300/60 dark:border-slate-700/60" />

          {/* Footer branding tag */}
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase text-center">
            UDHAM SINGH NAGAR • GEOPORTAL
          </p>
        </form>
      </div>
    </div>
  );
}
