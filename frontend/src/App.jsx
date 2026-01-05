import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api/axios';

import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import CoordinacionDashboard from './pages/CoordinacionDashboard.jsx';
import CoordinacionPersonas from './pages/CoordinacionPersonas.jsx';
import DocenteClases from './pages/DocenteClases.jsx';
import DocenteClaseDetalle from './pages/DocenteClaseDetalle.jsx';
import BancoPreguntas from './pages/BancoPreguntas.jsx';
import ExamenesDashboard from './pages/ExamenesDashboard.jsx';

function unwrapUser(data) {
  if (!data) return null;
  if (typeof data === 'object' && 'response' in data) return data.response;
  return data;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const onLogin = async (correo, password) => {
    // Backend setea cookie HttpOnly aquí
    await api.post('/api/auth/login', { correo, password });

    // Luego pedimos /me para obtener user
    const me = await api.get('/api/auth/user');
    setUser(unwrapUser(me.data));
  };

  const onLogout = async () => {
    // Intento POST y fallback a GET por si tu router usa otro método
    try {
      await api.post('/api/auth/logout');
    } catch {
        await api.get('/api/auth/logout');
    }

    localStorage.removeItem('token'); // limpieza por si quedó
    setUser(null);
  };

  useEffect(() => {
    (async () => {
      // Asegura limpieza del flujo viejo
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
        <Route path="/login" element={<Login onLogin={onLogin} />} />

        <Route
          path="/"
          element={
            <ProtectedRoute user={user} initialized={initialized}>
              <AppLayout user={user} onLogout={onLogout} />
            </ProtectedRoute>
          }
        >
          <Route
            path="coordinacion/dashboard"
            element={<CoordinacionDashboard currentUser={user} />}
          />

          <Route
            path="coordinacion/personas"
            element={<CoordinacionPersonas currentUser={user} />}
          />
          <Route
            path="docente/clases"
            element={<DocenteClases currentUser={user} />}
          />
          <Route
            path="docente/clases/:seccionId"
            element={<DocenteClaseDetalle currentUser={user} />}
          />
          <Route
            path="banco"
            element={<BancoPreguntas currentUser={user} />}
          />
          <Route
            path="coordinacion/banco"
            element={<BancoPreguntas currentUser={user} />}
          />
          <Route
            path="examenes"
            element={<ExamenesDashboard currentUser={user} />}
          />
          <Route
            path="docente/examenes"
            element={<ExamenesDashboard currentUser={user} />}
          />
          <Route
            path="docente/examenes/:seccionId"
            element={<ExamenesDashboard currentUser={user} />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
