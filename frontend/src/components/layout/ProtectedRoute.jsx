// src/components/layout/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import PageLoader from "../ui/PageLoader";

function unwrapUser(data) {
  if (!data) return null;
  if (typeof data === "object" && "response" in data) return data.response;
  return data;
}

// Definición de permisos por rol
// 1 = Admin, 2 = Coordinador, 3 = Docente TC, 4 = Docente, 5 = Estudiante
const ROLE_PERMISSIONS = {
  // Rutas de coordinación - solo coordinadores (2)
  "/coordinacion/dashboard": [2],
  "/coordinacion/personas": [2],
  "/coordinacion/banco": [1, 2, 3, 4],

  // Rutas de docentes - coordinador y docentes (2, 3, 4)
  "/docente/clases": [2, 3, 4],
  "/docente/examenes": [2, 3, 4],

  // Rutas de banco de preguntas - admin, coordinador, docentes
  "/banco": [1, 2, 3, 4],

  // Rutas de alumnos - solo estudiantes (5)
  "/alumno/examenes": [5],
  "/alumno/examen": [5],
};

// Ruta por defecto según el rol del usuario
const DEFAULT_ROUTES = {
  1: "/banco", // Admin -> banco de preguntas
  2: "/coordinacion/dashboard", // Coordinador -> dashboard
  3: "/docente/clases", // Docente TC -> mis clases
  4: "/docente/clases", // Docente -> mis clases
  5: "/alumno/examenes", // Estudiante -> mis exámenes
};

// Verifica si el usuario tiene acceso a una ruta
function hasAccess(roleId, pathname) {
  // Encontrar la ruta base que coincide
  for (const [route, allowedRoles] of Object.entries(ROLE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return allowedRoles.includes(roleId);
    }
  }
  // Si no hay restricción definida, permitir acceso
  return true;
}

// Obtiene la ruta de redirección para un rol
function getDefaultRoute(roleId) {
  return DEFAULT_ROUTES[roleId] || "/";
}

export default function ProtectedRoute({ user, initialized, children }) {
  const loc = useLocation();
  const u = unwrapUser(user);

  // Mostrar loader mientras se inicializa
  if (!initialized) {
    return <PageLoader />;
  }

  // Verificar si está logueado
  const isLogged =
    !!u && (u.login === true || !!u.id || !!u.correo || !!u.nombre_completo);

  if (!isLogged) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // Verificar permisos de rol
  const roleId = u?.rol_id ?? u?.role_id ?? null;

  if (roleId && !hasAccess(roleId, loc.pathname)) {
    // Redirigir a la ruta por defecto del rol
    const defaultRoute = getDefaultRoute(roleId);
    return <Navigate to={defaultRoute} replace />;
  }

  return children;
}
