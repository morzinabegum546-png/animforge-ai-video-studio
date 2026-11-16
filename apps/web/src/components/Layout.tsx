import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Film,
  FolderOpen,
  Code2,
  ListVideo,
  History,
  Settings,
  ShieldCheck,
  Sparkles,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LayoutProps {
  easyMode: boolean;
  setEasyMode: (v: boolean) => void;
  userEmail: string;
  isAdmin: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ easyMode, setEasyMode, userEmail, isAdmin }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/new', label: 'New Project', icon: PlusCircle },
    { to: '/references', label: 'Reference Library', icon: Film },
    { to: '/assets', label: 'Asset Library', icon: FolderOpen },
    { to: '/queue', label: 'Render Queue', icon: ListVideo },
    { to: '/exports', label: 'Export History', icon: History },
    { to: '/settings', label: 'User Settings', icon: Settings },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Dashboard', icon: ShieldCheck }] : []),
  ];

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 font-semibold text-indigo-400">
          <Sparkles className="w-5 h-5" />
          <span>AnimForge Studio</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg bg-slate-800">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? 'block' : 'hidden'
        } md:flex md:w-64 md:flex-col bg-slate-900/95 border-r border-slate-800 shrink-0`}
      >
        <div className="hidden md:flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">AnimForge Studio</div>
            <div className="text-[11px] text-slate-400">AI 2D & 3D Production</div>
          </div>
        </div>

        {/* Easy / Advanced Mode Switch */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center justify-between bg-slate-950 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setEasyMode(true)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                easyMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Easy Mode
            </button>
            <button
              onClick={() => setEasyMode(false)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1 ${
                !easyMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Advanced
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span className="truncate max-w-[160px]">{userEmail}</span>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
