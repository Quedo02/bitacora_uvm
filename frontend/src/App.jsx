// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api/axios';

import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import CoordinacionDashboard from './pages/CoordinacionDashboard.jsx';
import CoordinacionPersonas from './pages/CoordinacionPersonas.jsx';
import DocenteClases from './pages/DocenteClases.jsx';
import DocenteClaseDetalle from './pages/DocenteClaseDetalle.jsx';
import BancoPreguntas from './pages/BancoPreguntas.jsx';
import ExamenesListado from "./pages/ExamenesListado";
import ExamenEditor from "./pages/ExamenEditor";
import ExamenAlumno from "./pages/ExamenAlumno";
import ExamenResultados from "./pages/ExamenResultados";
import MisExamenesAlumno from './pages/MisExamenesAlumno.jsx';
import IntentoDetalle from "./pages/IntentoDetalle";
import ResultadoAlumno from './pages/ResultadoAlumno.jsx';

function unwrapUser(data) {
  if (!data) return null;
  if (typeof data === 'object' && 'response' in data) return data.response;
  return data;
}

// Componente para redirigir a la ruta por defecto según el rol
function RoleBasedRedirect({ user }) {
  const roleId = user?.rol_id ?? user?.role_id;
  
  const defaultRoutes = {
    1: '/banco',                    // Admin
    2: '/coordinacion/dashboard',   // Coordinador
    3: '/docente/clases',           // Docente TC
    4: '/docente/clases',           // Docente
    5: '/alumno/examenes',          // Estudiante
  };
  
  const targetRoute = defaultRoutes[roleId] || '/login';
  return <Navigate to={targetRoute} replace />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const onLogin = async (correo, password) => {
    await api.post('/api/auth/login', { correo, password });
    const me = await api.get('/api/auth/user');
    setUser(unwrapUser(me.data));
  };

  const onLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      await api.get('/api/auth/logout');
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    (async () => {
      localStorage.removeItem('token');

      try {
        const me = await api.get('/api/auth/user');
        setUser(unwrapUser(me.data));
      } catch {
        setUser(null);
      } finally {
        setInitialized(true);
      }
    })();
  }, []);

  return (
    <BrowserRouter basename="/app">
      <Routes>
        {/* Ruta pública de login */}
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        
        {/* Página 404 */}
        <Route path="/404" element={<NotFound />} />

        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute user={user} initialized={initialized}>
              <AppLayout user={user} onLogout={onLogout} />
            </ProtectedRoute>
          }
        >
          {/* Redirige desde la raíz a la ruta por defecto según el rol */}
          <Route 
            index 
            element={
              user ? <RoleBasedRedirect user={user} /> : <Navigate to="/login" replace />
            } 
          />

          {/* Rutas de coordinación */}
          <Route
            path="coordinacion/dashboard"
            element={<CoordinacionDashboard currentUser={user} />}
          />
          <Route
            path="coordinacion/personas"
            element={<CoordinacionPersonas currentUser={user} />}
          />

          {/* Rutas de docentes */}
          <Route
            path="docente/clases"
            element={<DocenteClases currentUser={user} />}
          />
          <Route
            path="docente/clases/:seccionId"
            element={<DocenteClaseDetalle currentUser={user} />}
          />
          <Route
            path="docente/examenes"
            element={<ExamenesListado currentUser={user} />}
          />
          <Route
            path="docente/examenes/:seccionId"
            element={<ExamenesListado currentUser={user} />}
          />
          <Route
            path="docente/examenes/:seccionId/editor/:examenId"
            element={<ExamenEditor currentUser={user} />}
          />
          <Route
            path="docente/examenes/:seccionId/resultados/:examenId"
            element={<ExamenResultados currentUser={user} />}
          />
          <Route
            path="docente/examenes/:seccionId/intento/:intentoId"
            element={<IntentoDetalle currentUser={user} />}
          />

          {/* Banco de preguntas */}
          <Route
            path="banco"
            element={<BancoPreguntas currentUser={user} />}
          />
          <Route
            path="coordinacion/banco"
            element={<BancoPreguntas currentUser={user} />}
          />

          {/* Rutas de alumnos */}
          <Route
            path="alumno/examenes"
            element={<MisExamenesAlumno currentUser={user} />}
          />
          <Route
            path="alumno/examen/:examenId"
            element={<ExamenAlumno currentUser={user} />}
          />
          <Route
            path="alumno/examen/:examenId/resultado/:intentoId"
            element={<ResultadoAlumno currentUser={user} />}
          />
        </Route>

        {/* Cualquier otra ruta redirige a 404 */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}