// src/pages/DocenteClases.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Skeleton from '../components/ui/Skeleton';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardBody, CardFooter } from '../components/ui/Card';
import {
  BookOpen,
  GraduationCap,
  CalendarDays,
  Users,
  Search,
  AlertCircle,
  Filter
} from 'lucide-react';

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === 'object' && data && 'response' in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function Pill({ children, className = '' }) {
  return (
    <span className={['inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700', className].join(' ')}>
      {children}
    </span>
  );
}

function evalLabel(tipo) {
  if (!tipo) return null;
  const t = String(tipo).toLowerCase();
  if (t === 'practica') return 'Práctica';
  if (t === 'teorica') return 'Teórica';
  return tipo;
}

export default function DocenteClases({ currentUser }) {
  const navigate = useNavigate();
  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isAllowed = roleId === 2 || roleId === 3 || roleId === 4;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  
  const [search, setSearch] = useState('');
  const [periodCode, setPeriodCode] = useState('');

  async function loadClases(code = null) {
    setLoading(true);
    setError('');
    
    try {
      const url = code 
        ? `/api/docente/clases/${encodeURIComponent(code)}`
        : '/api/docente/clases';

      const { data } = await api.get(url);
      setPayload(unwrapResponse(data) || data || null);
    } catch (e) {
      console.error(e);
      setPayload(null);
      setError(
        e?.response?.data?.response ||
        'No fue posible cargar tus clases.'
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
    loadClases();
  }, [isAllowed]);

  const clases = safeArray(payload?.clases);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clases;

    return clases.filter((c) => {
      const mat = String(c?.materia?.nombre ?? '').toLowerCase();
      const car = String(c?.carrera?.nombre ?? '').toLowerCase();
      const cod = String(c?.materia?.codigo ?? '').toLowerCase();
      const grp = String(c?.grupo ?? '').toLowerCase();
      const per = String(c?.periodo ?? '').toLowerCase();
      const tipo = String(c?.materia?.tipo_evaluacion ?? '').toLowerCase();
      const est = String(c?.seccion_estado ?? '').toLowerCase();

      return (
        mat.includes(term) ||
        car.includes(term) ||
        cod.includes(term) ||
        grp.includes(term) ||
        per.includes(term) ||
        tipo.includes(term) ||
        est.includes(term)
      );
    });
  }, [clases, search]);

  const handleSearchPeriod = () => {
    const code = periodCode.trim();
    if (!code) return; 
    loadClases(code);
  };

  const handleResetPeriod = () => {
    setPeriodCode('');
    loadClases();
  };

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Acceso restringido
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Esta página solo está disponible para Docentes.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="px-1 py-2 space-y-5">
      {/* Header y Filtros */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          
          {/* Título */}
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red/10 to-brand-red/20 shadow-sm">
              <BookOpen className="h-6 w-6 text-brand-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Docente • Mis clases
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona una clase para capturar o revisar calificaciones.
              </p>
            </div>
          </div>

          {/* Controles de Periodo */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 ml-1">Periodo:</span>
              <Input
                value={periodCode}
                onChange={(e) => setPeriodCode(e.target.value)}
                placeholder="Ej. 2025-C1"
                className="w-28 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleResetPeriod}
                title="Cargar periodo actual"
              >
                Actual
              </Button>
              <Button 
                size="sm" 
                onClick={handleSearchPeriod}
                disabled={!periodCode.trim()}
              >
                Buscar
              </Button>
            </div>
          </div>
        </div>

        {/* Buscador Local */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 w-full md:w-auto md:max-w-md">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por materia, grupo, carrera..."
              className="w-full border-none p-0 focus:ring-0"
            />
          </div>
        </div>
      </section>

      {/* Body: Grid de Clases */}
      <section>
        {loading && (
          <div className="space-y-3">
            <Skeleton height={22} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
               <Skeleton height={200} />
               <Skeleton height={200} />
               <Skeleton height={200} />
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div className="flex-1">{error}</div>
              <Button size="sm" variant="secondary" onClick={() => loadClases(periodCode)}>
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <Filter className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              No se encontraron clases
            </h3>
            <p className="text-sm text-slate-500">
              {periodCode 
                ? `Verifica el periodo "${periodCode}" o intenta con otro.` 
                : "No tienes asignaciones activas en el periodo actual."}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const alumnosArr = safeArray(c?.alumnos);
              const alumnosCount = c?.alumnos_count ?? alumnosArr.length;
              const tipoEval = evalLabel(c?.materia?.tipo_evaluacion);

              return (
                <Card
                  key={`${c.seccion_id}-${c.periodo}`}
                  hover
                  onClick={() =>
                    navigate(`/docente/clases/${c.seccion_id}`, {
                      state: { clase: c }
                    })
                  }
                  className="group text-left"
                >
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                          <Pill>{c?.periodo ?? '—'}</Pill>
                          {c?.grupo && <Pill>Gpo {c.grupo}</Pill>}
                          {tipoEval && <Pill>{tipoEval}</Pill>}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-red leading-tight transition-colors">
                          {c?.materia?.nombre ?? 'Materia desconocida'}
                        </h3>
                        <div className="mt-1 text-xs font-mono text-slate-500">
                          {c?.materia?.codigo ?? 'SIN CODIGO'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 flex-shrink-0 group-hover:bg-brand-red/5 transition-colors">
                        <BookOpen className="h-5 w-5 text-brand-red" />
                      </div>
                    </div>

                    <div className="my-4 h-px w-full bg-slate-100" />

                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-medium truncate" title={c?.carrera?.nombre}>
                          {c?.carrera?.nombre ?? 'Carrera general'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="capitalize">{c?.modalidad ?? 'Presencial'}</span>
                        {c?.seccion_estado && (
                           <span className={`ml-auto text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                             c.seccion_estado === 'activa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                           }`}>
                             {c.seccion_estado}
                           </span>
                        )}
                      </div>
                    </div>

                    {/* Componentes de evaluación */}
                    {safeArray(c?.componentes).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {safeArray(c?.componentes).map((cmp) => (
                          <span 
                            key={`${c.seccion_id}-${cmp.tipo}`} 
                            className="inline-flex items-center rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600"
                            title={`CRN: ${cmp.crn}`}
                          >
                             <span className="capitalize font-medium mr-1">{cmp.tipo}:</span> 
                             {cmp.peso}%
                          </span>
                        ))}
                      </div>
                    )}
                  </CardBody>
                  
                  <CardFooter>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Users className="h-3.5 w-3.5" />
                          <span>{alumnosCount} alumnos</span>
                       </div>
                       <span className="text-xs font-medium text-brand-red group-hover:underline">
                          Ver detalle →
                       </span>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}