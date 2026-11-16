import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './lib/firebase';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { NewProject } from './pages/NewProject';
const ProjectStudio = lazy(() => import('./pages/ProjectStudio').then((m) => ({ default: m.ProjectStudio })));
import { ReferenceLibrary } from './pages/ReferenceLibrary';
import { AssetLibrary } from './pages/AssetLibrary';
import { RenderQueue } from './pages/RenderQueue';
import { SettingsPage } from './pages/Settings';
import { AdminDashboard } from './pages/AdminDashboard';

export function App() {
  const [easyMode, setEasyMode] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const isAdmin = false; // admin tools need the server (not enabled yet)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // Demo mode: Firebase not configured, skip login/registration entirely
      setUserEmail('demo@animforge.local');
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email || null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading AnimForge Studio...</div>;
  }

  if (!userEmail && isFirebaseConfigured) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout easyMode={easyMode} setEasyMode={setEasyMode} userEmail={userEmail || 'demo@animforge.local'} isAdmin={isAdmin} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewProject easyMode={easyMode} />} />
          <Route path="/projects/:id" element={<Suspense fallback={<div className="p-8 text-slate-400 text-sm">Loading studio...</div>}><ProjectStudio easyMode={easyMode} /></Suspense>} />
          <Route path="/references" element={<ReferenceLibrary />} />
          <Route path="/assets" element={<AssetLibrary />} />
          <Route path="/queue" element={<RenderQueue />} />
          <Route path="/exports" element={<RenderQueue completedOnly />} />
          <Route path="/settings" element={<SettingsPage />} />
          {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
