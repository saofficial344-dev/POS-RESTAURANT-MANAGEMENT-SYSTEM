import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, Bell } from 'lucide-react';

const PAGE_TITLES = {
  '/platform/dashboard':   'Dashboard',
  '/platform/restaurants': 'Restaurant Management',
  '/platform/analytics':   'Platform Analytics',
  '/platform/audit-logs':  'Audit Logs',
  '/platform/api-keys':    'API Management',
  '/platform/support':     'Support Center',
};

const PlatformNavbar = () => {
  const { pathname } = useLocation();
  const title = Object.entries(PAGE_TITLES).find(([p]) => pathname.startsWith(p))?.[1] ?? 'Developer Platform';

  return (
    <header className="h-14 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Shield size={16} className="text-indigo-400" />
        <h1 className="text-sm font-semibold text-gray-200">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Platform Online
        </div>
      </div>
    </header>
  );
};

export default PlatformNavbar;
