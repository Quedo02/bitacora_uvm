// src/pages/DocenteClaseDetalle.jsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
// Asumo que tienes un Input simple, si no, puedes quitar esta linea
import Input from '../components/ui/Input'; 

import {
  ArrowLeft,
  FileSpreadsheet,
  BookOpen,
  Users,
  AlertCircle,
  Download,
  UploadCloud,
  Search
} from 'lucide-react';

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === 'object' && data && 'response' in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function Pill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 ${className}`}>
      {children}
    </span>
  );
}

function formatGrade(val) {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  return isNaN(num) ? '—' : num.toFixed(2);
}

export default function DocenteClaseDetalle({ currentUser }) {
  const { seccionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isAllowed = roleId === 3 || roleId === 4;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado local de la clase
  const [clase, setClase] = useState(location.state?.clase ?? null);
  
  // Estado para las pestañas (1, 2, 3, final)
  const [activeTab, setActiveTab] = useState('1'); 
  const [search, setSearch] = useState('');

  // Carga de datos
  async function loadClaseDetalle() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/docente/clase/${seccionId}`);
      const payload = unwrapResponse(data) || data || null;
      setClase(payload?.clase ?? payload ?? null);
    } catch (e) {
      console.error(e);
      setClase(null);
      setError(
        e?.response?.data?.response ||
        'No fue posible cargar el detalle de la clase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    // Si ya venía la info básica por navegación, la usamos primero para renderizar rápido
    if (location.state?.clase && !clase) {
      setClase(location.state.clase);
    }
    loadClaseDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, seccionId]);

  // --- LÓGICA DE DATOS ---

  const alumnos = safeArray(clase?.alumnos);
  
  // Filtrado local por buscador
  const filteredAlumnos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return alumnos;
    return alumnos.filter(a => 
      String(a?.nombre ?? '').toLowerCase().includes(term) ||
      String(a?.matricula ?? '').toLowerCase().includes(term)
    );
  }, [alumnos, search]);

  // Construcción de filas para la tabla
  const rows = useMemo(() => {
    return filteredAlumnos.map((a) => {
      // AQUÍ: En el futuro, cuando tu backend soporte tabs, seleccionarás
      // las calificaciones basándote en `activeTab`.
      // Por ahora usamos las calificaciones generales que manda el backend.
      const cal = a?.calificaciones || {};

      return {
        id: a?.id,
        nombre: a?.nombre ?? 'Sin nombre',
        matricula: a?.matricula ?? '—',
        correo: a?.correo ?? '—',
        // Datos para las celdas de calificación
        blackboard: cal.blackboard,
        continua: cal.continua,
        examen: cal.examen,
        final: cal.final,
      };
    });
  }, [filteredAlumnos, activeTab]); // Dependencia activeTab para recargar cuando cambie

  // Definición de columnas
  const columns = useMemo(() => [
    { 
      header: 'Alumno', 
      accessor: 'nombre',
      cell: (row) => (
        <div className="flex flex-col">
           <span className="font-medium text-slate-900">{row.nombre}</span>
           <span className="text-[11px] text-slate-400 md:hidden">{row.matricula}</span>
        </div>
      )
    },
    { header: 'Matrícula', accessor: 'matricula', className: 'hidden md:table-cell w-32' },
    
    // Columnas de calificación (Dinámicas según la pestaña si quisieras cambiar headers)
    { 
      header: 'Blackboard (50%)', 
      accessor: 'blackboard', 
      width: '130px',
      cell: (r) => <span className="font-mono text-slate-700">{formatGrade(r.blackboard)}</span>
    },
    { 
      header: 'Eval. Cont. (20%)', 
      accessor: 'continua', 
      width: '130px',
      cell: (r) => <span className="font-mono text-slate-700">{formatGrade(r.continua)}</span>
    },
    { 
      header: 'Examen (30%)', 
      accessor: 'examen', 
      width: '110px',
      cell: (r) => <span className="font-mono text-slate-700">{formatGrade(r.examen)}</span>
    },
    { 
      header: 'Total Parcial', 
      accessor: 'final', 
      width: '110px',
      cell: (r) => {
        const val = Number(r.final);
        const isFailing = !isNaN(val) && val < 70; // Ejemplo de regla visual
        return (
          <span className={`font-bold font-mono ${isFailing ? 'text-brand-red' : 'text-slate-900'}`}>
            {formatGrade(r.final)}
          </span>
        );
      }
    }
  ], []);

  // --- RENDER ---

  if (!isAllowed) {
    return <div className="p-10 text-center text-slate-500">Acceso restringido.</div>;
  }

  const tabs = [
    { id: '1', label: 'Parcial 1' },
    { id: '2', label: 'Parcial 2' },
    { id: '3', label: 'Parcial 3' },
    { id: 'final', label: 'Semestre' },
  ];

  return (
    <div className="px-1 py-2 space-y-5">
      
      {/* 1. Header de Información de la Clase */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/docente/clases')}
                className="mb-2 -ml-2 text-slate-500 hover:text-slate-800"
              >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Mis Clases
            </Button>
            
            <h1 className="text-2xl font-bold text-slate-900">
              {clase?.materia?.nombre ?? 'Cargando materia...'}
            </h1>
            
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500 items-center">
              <span className="font-mono bg-slate-100 px-1.5 rounded text-slate-600">
                {clase?.materia?.codigo}
              </span>
              <span>•</span>
              <span>{clase?.carrera?.nombre}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{clase?.alumnos_count ?? alumnos.length} alumnos</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {clase?.periodo && <Pill className="bg-blue-50 text-blue-700">{clase.periodo}</Pill>}
                {clase?.grupo && <Pill>Grupo {clase.grupo}</Pill>}
                {clase?.materia?.tipo_evaluacion && <Pill>Tipo: {clase.materia.tipo_evaluacion}</Pill>}
                {clase?.seccion_estado === 'activa' && (
                  <Pill className="bg-emerald-50 text-emerald-700">Activa</Pill>
                )}
            </div>
          </div>
          
          {/* Botón de reporte general (opcional) */}
          <div>
            <Button variant="outline_secondary" size="sm" className="gap-2">
               <Download className="h-4 w-4" />
               Reporte Semestral
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Área de Trabajo (Tabs y Tabla) */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        
        {/* Navegación de Pestañas */}
        <div className="border-b border-slate-200 bg-slate-50/50 px-4 pt-4 flex gap-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-1 ${
                activeTab === tab.id
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar de acciones (Importar, Buscar) */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-2 w-full sm:max-w-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-red/50 transition">
              <Search className="h-4 w-4 text-slate-400" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar alumno..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => alert("Aquí abrirás el modal de Teams")}>
                 <UploadCloud className="h-4 w-4" />
                 <span className="hidden sm:inline">Importar</span> Teams
              </Button>
              <Button size="sm" className="gap-2" onClick={() => alert("Aquí abrirás el modal de Excel")}>
                 <FileSpreadsheet className="h-4 w-4" />
                 <span className="hidden sm:inline">Importar</span> Excel
              </Button>
            </div>
        </div>

        {/* Tabla */}
        <div className="p-4">
          {loading && <Skeleton rows={5} />}
          
          {!loading && error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
               <AlertCircle className="h-5 w-5" />
               {error}
            </div>
          )}

          {!loading && !error && (
             <>
               {rows.length > 0 ? (
                 <Table columns={columns} data={rows} />
               ) : (
                 <div className="text-center py-10 text-slate-500">
                   {search ? 'No se encontraron alumnos con ese criterio.' : 'No hay alumnos inscritos en este grupo.'}
                 </div>
               )}
             </>
          )}
        </div>
        
        {/* Footer de sección: Resumen de ponderaciones (informativo) */}
        {clase?.componentes && (
           <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap gap-4">
              <span className="font-semibold text-slate-700">Ponderación actual:</span>
              {safeArray(clase.componentes).map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                   <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                   {c.tipo.toUpperCase()}: {c.peso}% 
                   <span className="font-mono text-[10px] text-slate-400 ml-1">({c.crn})</span>
                </span>
              ))}
           </div>
        )}
      </section>
    </div>
  );
}