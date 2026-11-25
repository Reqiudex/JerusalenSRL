import React, { useState, useEffect } from 'react';
import ErpApp from '../apps/erp/src/ErpApp';
import DuenoApp from '../apps/dueno/src/DuenoApp';

function detectInitialApp() {
  if (typeof window === 'undefined') return 'erp';
  const host = window.location.hostname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const appParam = params.get('app');
  if (appParam === 'dueno' || appParam === 'adminj') return 'dueno';
  if (appParam === 'erp' || appParam === 'erpj') return 'erp';
  if (host.startsWith('adminj.') || window.location.pathname.startsWith('/dueno')) {
    return 'dueno';
  }
  return 'erp';
}

export default function App() {
  const [appMode, setAppMode] = useState(detectInitialApp);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('jerusalen_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('jerusalen_theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  if (appMode === 'dueno') {
    return (
      <DuenoApp
        theme={theme}
        onToggleTheme={toggleTheme}
        onSwitchToErp={() => setAppMode('erp')}
      />
    );
  }

  return (
    <ErpApp
      theme={theme}
      onToggleTheme={toggleTheme}
      onSwitchToDueno={() => setAppMode('dueno')}
    />
  );
}
