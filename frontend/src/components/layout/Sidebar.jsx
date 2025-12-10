// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import {
  User as UserIcon,
  LayoutDashboard,
  Users,
  LogOut,
  BookOpen
} from 'lucide-react';

const roleName = {
  1: 'Admin',
  2: 'Coordinador',
  3: 'Docente TC',
  4: 'Docente',
  5: 'Estudiante'
};

const coordinacion = (roleId) => roleId === 2;
const docente = (roleId) => roleId === 2 || roleId === 3 || roleId === 4;



export default function Sidebar({ user, onLogout }) {
  const roleId = user?.rol_id ?? null;

  return (
    <aside
      className="
        fixed inset-y-0 left-0 z-20
        flex w-64 flex-col
        bg-gradient-to-b from-brand-red to-brand-wine
        px-4 py-5 text-brand-white
      "
    >
      {/* Logo UVM */}
      <div className="mb-6 flex justify-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <img
            src="/uvm-logo-blanco.png"
            alt="UVM"
            className="h-16 w-auto object-contain drop-shadow"
          />
          <span className="text-xs font-medium tracking-wide text-brand-white/80">
            Universidad del Valle de México
          </span>
        </div>
      </div>

      {/* Usuario */}
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-brand-black/20 px-3 py-3 backdrop-blur-[1px]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-white">
          <UserIcon className="h-5 w-5 text-brand-red" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">
            {user?.nombre_completo || 'Usuario'}
          </div>
          <div className="text-xs text-brand-white/80">
            {roleName[roleId] || '—'}
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1">
        <ul className="space-y-1 text-sm">
          {coordinacion(roleId) && (
            <li>
              <NavItem to="/coordinacion/dashboard" end icon={LayoutDashboard}>
                Panel de Coordinacion
              </NavItem>
            </li>
          )}

          {coordinacion(roleId) && (
            <li>
              <NavItem to="/coordinacion/personas" icon={Users}>
                Coordinación
              </NavItem>
            </li>
          )}

          {docente(roleId) && (
            <li>
              <NavItem to="/docente/clases" icon={BookOpen}>
                Mis clases
              </NavItem>
            </li>
          )}
        </ul>
      </nav>

      {/* Logout */}
      <div className="mt-6">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-white/70 bg-brand-black/20 px-3 py-2 text-sm font-medium text-brand-white transition hover:bg-brand-white hover:text-brand-red"
        >
          <LogOut className="h-4 w-4" />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}

// Item de navegación usando rojo como principal
function NavItem({ to, end, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'border-l-4 border-brand-white bg-brand-black/25 text-brand-white'
            : 'text-brand-white/80 hover:bg-brand-red/30 hover:text-brand-white'
        ].join(' ')
      }
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{children}</span>
    </NavLink>
  );
}
