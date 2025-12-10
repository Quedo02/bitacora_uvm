import { Navigate, useLocation } from 'react-router-dom';

function unwrapUser(data) {
  if (!data) return null;
  if (typeof data === 'object' && 'response' in data) return data.response;
  return data;
}

export default function ProtectedRoute({ user, initialized, children }) {
  const loc = useLocation();
  const u = unwrapUser(user);

  if (!initialized) {
    return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl bg-white px-6 py-4 shadow-md">
        <p className="text-sm font-medium text-slate-700">Cargando…</p>
      </div>
    </div>
  );
  }

  const isLogged =
    !!u && (u.login === true || !!u.id || !!u.correo || !!u.nombre_completo);

  if (!isLogged) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  return children;
}
