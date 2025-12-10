// src/components/layout/AppLayout.jsx
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function AppLayout({ user, onLogout }) {
  return (
    <div className="flex min-h-screen bg-brand-white">
      {/* Sidebar fijo */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Contenido principal, con margen a la derecha del sidebar */}
      <main className="ml-64 flex-1 min-h-screen overflow-y-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
