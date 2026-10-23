/**
 * @file main.js
 * @module main
 * @description
 * Client Application Entrypoint & React 19 DOM Root Mount.
 * 
 * Architectural Role:
 * - Bootstraps the FoodZa Single Page Application (SPA).
 * - Mounts `<App />` within React 19 `<StrictMode>` into the `#root` container.
 * - Integrates Vercel Web Analytics (`@vercel/analytics/react`).
 * - Self-Healing Deployment Handler:
 *   Listens for Vite's `vite:preloadError` event. If a new deployment removes or re-hashes old dynamic
 *   chunks while an active user is browsing, it triggers a seamless browser reload instead of throwing
 *   an unrecoverable chunk-load error.
 */

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './index.css';

// Automatically and silently reload if a new deployment removed an old chunk, avoiding user disruption
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

/**
 * Top-Level Error Boundary preventing white/blank screen crashes
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FoodZa Application Render Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('food_street_orders');
    } catch {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return _jsxs("div", {
        className: "min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans",
        children: [
          _jsx("div", {
            className: "w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 text-2xl shadow-sm",
            children: "⚠️"
          }),
          _jsx("h1", {
            className: "text-xl font-black text-gray-900 mb-2",
            children: "Something went wrong"
          }),
          _jsx("p", {
            className: "text-xs text-gray-500 max-w-sm mb-6",
            children: "FoodZa encountered an issue loading this page. Clearing corrupted local state and reloading will restore the store."
          }),
          _jsx("button", {
            onClick: this.handleReset,
            className: "px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-red-500/25 active:scale-95 transition-all cursor-pointer",
            children: "Refresh & Restore Store"
          })
        ]
      });
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  _jsxs(StrictMode, {
    children: [
      _jsx(ErrorBoundary, { children: _jsx(App, {}) }),
      _jsx(Analytics, {})
    ]
  })
);
