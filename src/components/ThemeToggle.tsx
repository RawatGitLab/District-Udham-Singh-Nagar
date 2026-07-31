import React from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({
  theme,
  onToggle,
  className = "",
  showLabel = true,
}: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      onClick={onToggle}
      type="button"
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
        isDark
          ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700 hover:border-slate-600 hover:text-amber-200"
          : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-600 hover:text-white"
      } ${className}`}
      title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      aria-label="Toggle application theme"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
          {showLabel && "Light"}
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-300 transition-transform duration-300 hover:-rotate-12" />
          {showLabel && "Dark"}
        </>
      )}
    </button>
  );
}
