// src/pages/DocenteClaseDetalle.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import {
  ArrowLeft,
  FileSpreadsheet,
  Users,
  AlertCircle,
  Download,
} from 'lucide-react';

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === 'object' && data && 'response' in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export default function DocenteClaseDetalle() {
  const { seccionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Parcial 1');

  // Pestañas fijas
  const TABS = ['Parcial 1', 'Parcial 2', 'Parcial 3', 'Final Semestral'];

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/docente/clase/${seccionId}`);
      
      if (res.data && res.data.ok) {
        setData(res.data);
      } else {
        setError(unwrapResponse(res.data) || 'Error desconocido');
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.response || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seccionId) fetchData();
  }, [seccionId]);

  const clase = data?.clase;
  const alumnos = safeArray(clase?.alumnos);
  const componentes = safeArray(clase?.componentes);

  // Filtrado de alumnos
  const filteredAlumnos = useMemo(() => {
    if (!search) return alumnos;
    const s = search.toLowerCase();
    return alumnos.filter(
      (a) =>
        (a.nombre || '').toLowerCase().includes(s) ||
        String(a.matricula || '').includes(s)
    );
  }, [alumnos, search]);

  // Estructura de columnas con agrupación
  const tableStructure = useMemo(() => {
    const estructuraMap = clase?.estructura_bitacora || {};
    const currentStructure = estructuraMap[activeTab];

    // Mapeo de componentes
    const componentMap = {
      blackboard: { label: 'Blackboard', abbr: 'BB' },
      continua: { label: 'Evaluación Continua', abbr: 'EC' },
      examen: { label: 'Examen', abbr: 'EX' }
    };

    const groups = [];

    // Siempre mostramos los tres componentes principales
    ['blackboard', 'continua', 'examen'].forEach(compKey => {
      const compInfo = componentMap[compKey];
      const peso = componentes.find(c => c.tipo === compKey)?.peso || 0;
      const actividades = currentStructure?.[compKey] || [];

      groups.push({
        component: compKey,
        label: compInfo.label,
        abbr: compInfo.abbr,
        peso: peso,
        actividades: actividades,
        // Si no hay actividades, mostramos solo una columna de resumen
        columns: actividades.length > 0 ? actividades : []
      });
    });

    return groups;
  }, [clase, activeTab, componentes]);

  // Calcular colspan total para el header
  const totalColumns = useMemo(() => {
    return 2 + tableStructure.reduce((sum, group) => {
      return sum + Math.max(1, group.columns.length);
    }, 0);
  }, [tableStructure]);

  // Preparar filas de datos
  const rows = useMemo(() => {
    return filteredAlumnos.map((alum) => {
      const row = {
        id: alum.id,
        nombre: alum.nombre ?? 'Sin nombre',
        matricula: alum.matricula ?? '—',
        correo: alum.correo ?? '—',
        components: {}
      };

      const bitacoraParcial = alum.bitacora?.[activeTab];

      // Procesar cada componente
      tableStructure.forEach(group => {
        const compKey = group.component;
        const actividadesData = bitacoraParcial?.[compKey] || [];
        
        row.components[compKey] = {
          resumen: alum.resumen_calificaciones?.[compKey],
          actividades: {}
        };

        // Mapear calificaciones por actividad_id
        actividadesData.forEach(item => {
          row.components[compKey].actividades[item.actividad_id] = item.calificacion_alumno;
        });
      });

      return row;
    });
  }, [filteredAlumnos, activeTab, tableStructure]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton height={40} width="30%" />
        <Skeleton height={200} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[98%] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline_secondary" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {clase?.materia?.nombre || 'Detalle de Clase'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span className="font-medium bg-brand-wine/10 text-brand-wine px-2 py-0.5 rounded">
                {clase?.grupo}
              </span>
              <span>•</span>
              <span>{clase?.carrera?.nombre}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {clase?.alumnos_count} Alumnos
              </span>
            </div>
          </div>
        </div>

        <Button variant="outline_primary" size="sm">
          <Download className="h-4 w-4 mr-2" /> Exportar Excel
        </Button>
      </div>

      {/* Tabs y Buscador */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap
                ${activeTab === tab 
                  ? 'border-brand-red text-brand-red bg-red-50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <Input 
            placeholder="Buscar alumno..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Tabla con columnas agrupadas */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              {/* Header con agrupación */}
              <thead>
                {/* Primera fila: Grupos de componentes */}
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-r border-slate-200">
                    Matrícula
                  </th>
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-r border-slate-200">
                    Alumno
                  </th>
                  {tableStructure.map((group, idx) => {
                    const colspan = Math.max(1, group.columns.length);
                    return (
                      <th 
                        key={group.component}
                        colSpan={colspan}
                        className={`px-3 py-2 text-center text-xs font-bold text-slate-700 border-r border-slate-200 ${
                          idx === tableStructure.length - 1 ? '' : 'border-r-2'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{group.label}</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            {group.peso}% del total
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {/* Segunda fila: Actividades individuales */}
                <tr className="border-b-2 border-slate-300 bg-slate-100">
                  {tableStructure.map((group, groupIdx) => {
                    // Si no hay actividades, mostramos una columna de promedio
                    if (group.columns.length === 0) {
                      return (
                        <th 
                          key={`${group.component}-promedio`}
                          className="px-2 py-2 text-center text-xs font-medium text-slate-600 border-r border-slate-200"
                        >
                          <div className="flex flex-col items-center">
                            <span>Promedio</span>
                            <span className="text-[9px] text-slate-400">{group.abbr}</span>
                          </div>
                        </th>
                      );
                    }

                    // Si hay actividades, mostramos cada una
                    return group.columns.map((act, actIdx) => (
                      <th 
                        key={act.actividad_id}
                        className={`px-2 py-2 text-center text-xs font-medium text-slate-600 ${
                          actIdx === group.columns.length - 1 ? 'border-r border-slate-200' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center" title={act.nombre_actividad}>
                          <span className="max-w-[120px] truncate">{act.nombre_actividad}</span>
                          <span className="text-[9px] text-slate-400">
                            {act.peso_actividad}% {group.abbr}
                          </span>
                        </div>
                      </th>
                    ));
                  })}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr 
                    key={row.id} 
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-xs">
                      {row.matricula}
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-200">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{row.nombre}</span>
                        <span className="text-xs text-slate-500">{row.correo}</span>
                      </div>
                    </td>

                    {tableStructure.map((group, groupIdx) => {
                      const compData = row.components[group.component];

                      // Si no hay actividades, mostramos solo el promedio
                      if (group.columns.length === 0) {
                        const promedio = compData?.resumen;
                        return (
                          <td 
                            key={`${group.component}-promedio`}
                            className="px-2 py-2.5 text-center border-r border-slate-200"
                          >
                            <span className={`font-medium ${
                              promedio != null && promedio < 60 ? 'text-red-600' : 'text-slate-700'
                            }`}>
                              {promedio != null ? promedio : '—'}
                            </span>
                          </td>
                        );
                      }

                      // Si hay actividades, mostramos cada calificación
                      return group.columns.map((act, actIdx) => {
                        const calif = compData?.actividades?.[act.actividad_id];
                        return (
                          <td 
                            key={act.actividad_id}
                            className={`px-2 py-2.5 text-center ${
                              actIdx === group.columns.length - 1 ? 'border-r border-slate-200' : ''
                            }`}
                          >
                            <span className={`font-medium ${
                              calif != null && calif < 60 ? 'text-red-600' : 'text-slate-700'
                            }`}>
                              {calif != null ? calif : '—'}
                            </span>
                          </td>
                        );
                      });
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p>{search ? 'No se encontraron alumnos.' : 'No hay alumnos inscritos.'}</p>
          </div>
        )}
      </div>

      {/* Footer informativo */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>* Las columnas agrupadas muestran el componente principal (BB, EC, EX) con sus actividades.</p>
        <p>* Los pesos en las actividades son relativos a su componente. Los pesos del componente son sobre la calificación final.</p>
      </div>
    </div>
  );
}