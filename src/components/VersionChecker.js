import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Current build timestamp compiled into the frontend bundle
    const currentBuild = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : null;
    let initialVersion = currentBuild;

    const checkVersion = async () => {
      try {
        const response = await fetch(`/version.json?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = data?.version;

        if (!serverVersion) return;

        if (!initialVersion) {
          initialVersion = serverVersion;
          return;
        }

        if (serverVersion !== initialVersion) {
          setUpdateAvailable(true);
        }
      } catch {
        // Silently ignore network check failures (offline, etc.)
      }
    };

    // Initial check after 5 seconds
    const initialTimer = setTimeout(checkVersion, 5000);

    // Periodic check every 60 seconds
    const interval = setInterval(checkVersion, 60000);

    // Check whenever tab becomes visible or receives focus
    const onFocus = () => checkVersion();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    // Hard reload bypassing HTTP cache
    window.location.reload(true);
  };

  if (!updateAvailable) return null;

  return _jsx("div", {
    className: "fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce duration-1000 max-w-sm w-[92%] sm:w-auto",
    children: _jsxs("div", {
      className: "bg-gray-900/95 backdrop-blur-md text-white border border-gray-700/80 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4",
      children: [
        _jsxs("div", {
          className: "flex items-center gap-3",
          children: [
            _jsx("div", {
              className: "w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0",
              children: _jsx(Sparkles, { className: "w-5 h-5 text-orange-400" }),
            }),
            _jsxs("div", {
              children: [
                _jsx("p", {
                  className: "text-xs font-bold text-gray-200 uppercase tracking-wider",
                  children: "New Update Available",
                }),
                _jsx("p", {
                  className: "text-xs text-gray-400",
                  children: "A new version of FoodZa is ready.",
                }),
              ],
            }),
          ],
        }),
        _jsxs("button", {
          onClick: handleUpdate,
          disabled: isUpdating,
          className: "bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer",
          children: [
            _jsx(RefreshCw, { className: `w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}` }),
            isUpdating ? 'Updating...' : 'Refresh',
          ],
        }),
      ],
    }),
  });
}
