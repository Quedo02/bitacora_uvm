// src/pages/examenes/ExamenesListado.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import ModalNuevoExamen from "../components/examenes/ModalNuevoExamen";
import {
  CalendarClock,
  History,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Search,
  X,
  Clock,
  FileText,
  AlertTriangle,
  BarChart3,
  Filter,
} from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatMx(mysqlDt) {
  if (!mysqlDt) return "-";
  const [d, t] = String(mysqlDt).split(" ");
  if (!d) return String(mysqlDt);
  const [yyyy, mm, dd] = d.split("-");
  const hhmm = (t || "").slice(0, 5);
  return `${dd}/${mm}/${yyyy}${hhmm ? " " + hhmm : ""}`;
}

function badgeClass(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "cerrado") return "bg-slate-100 text-slate-700";
  if (e === "programado") return "bg-green-100 text-green-700";
  if (e === "activo") return "bg-blue-100 text-blue-700";
  if (e === "borrador") return "bg-amber-100 text-amber-800";
  if (e === "archivado") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function examenHaComenzado(ex) {
  if (!ex?.fecha_inicio) return false;
  const inicio = new Date(ex.fecha_inicio);
  return Date.now() >= inicio.getTime();
}

function puedeEditar(ex) {
  const estado = String(ex?.estado || "").toLowerCase();
  // Puede editar si es borrador O si está programado pero NO ha comenzado
  if (estado === "borrador") return true;
  if (estado === "programado" && !examenHaComenzado(ex)) return true;
  return false;
}

function puedeEliminar(ex) {
  const estado = String(ex?.estado || "").toLowerCase();
  // Solo puede eliminar borradores o programados que no han comenzado
  if (estado === "borrador") return true;
  if (estado === "programado" && !examenHaComenzado(ex)) return true;
  return false;
}

export default function ExamenesListado({ currentUser }) {
  const navigate = useNavigate();

  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isDocente = roleId === 3 || roleId === 4;
  const isAdmin = roleId === 1;
  const isStaff = [1, 2, 3, 4].includes(roleId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [clases, setClases] = useState([]);
  const [todosExamenes, setTodosExamenes] = useState([]);
  const [tab, setTab] = useState("activos");

  // Filtros
  const [filtroSeccion, setFiltroSeccion] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [seccionParaCrear, setSeccionParaCrear] = useState("");

  // Modal de crear examen
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Modal de confirmar eliminación
  const [examenAEliminar, setExamenAEliminar] = useState(null);

  const seccionMap = useMemo(() => {
    const m = new Map();
    for (const c of safeArray(clases)) {
      if (!c?.seccion_id) continue;
      const materia = c?.materia;
      const carrera = c?.carrera;
      const label = [
        materia?.nombre ? `${materia.nombre}` : `Materia ${c?.materia_id ?? ""}`,
        c?.grupo ? `Grupo ${c.grupo}` : "",
        c?.periodo ? `(${c.periodo})` : "",
        carrera?.nombre ? `· ${carrera.nombre}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      m.set(Number(c.seccion_id), { ...c, __label: label || `Sección ${c.seccion_id}` });
    }
    return m;
  }, [clases]);

  // Aplicar filtros
  const examenesConFiltros = useMemo(() => {
    let resultado = [...todosExamenes];

    // Filtro por sección
    if (filtroSeccion) {
      resultado = resultado.filter((e) => Number(e.seccion_id) === Number(filtroSeccion));
    }

    // Filtro por estado
    if (filtroEstado) {
      resultado = resultado.filter((e) => String(e.estado || "").toLowerCase() === filtroEstado.toLowerCase());
    }

    // Filtro por búsqueda
    if (filtroBusqueda.trim()) {
      const busqueda = filtroBusqueda.toLowerCase();
      resultado = resultado.filter((e) => {
        const clase = seccionMap.get(Number(e.seccion_id));
        const materiaNombre = clase?.materia?.nombre?.toLowerCase() || "";
        const grupo = clase?.grupo?.toLowerCase() || "";
        const tipo = String(e.tipo || "").toLowerCase();
        const parcial = e.parcial_id ? `parcial ${e.parcial_id}` : "";

        return (
          materiaNombre.includes(busqueda) ||
          grupo.includes(busqueda) ||
          tipo.includes(busqueda) ||
          parcial.includes(busqueda)
        );
      });
    }

    return resultado;
  }, [todosExamenes, filtroSeccion, filtroEstado, filtroBusqueda, seccionMap]);

  const activos = useMemo(() => {
    return examenesConFiltros.filter((e) => {
      const estado = String(e?.estado).toLowerCase();
      return estado !== "cerrado" && estado !== "archivado";
    });
  }, [examenesConFiltros]);

  const historial = useMemo(() => {
    return examenesConFiltros.filter((e) => String(e?.estado).toLowerCase() === "cerrado");
  }, [examenesConFiltros]);

  const archivados = useMemo(() => {
    return examenesConFiltros.filter((e) => String(e?.estado).toLowerCase() === "archivado");
  }, [examenesConFiltros]);

  const examenesToShow = useMemo(() => {
    if (tab === "historial") return historial;
    if (tab === "archivados") return archivados;
    return activos;
  }, [tab, activos, historial, archivados]);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: todosExamenes.length,
      borradores: todosExamenes.filter((e) => String(e.estado).toLowerCase() === "borrador").length,
      programados: todosExamenes.filter((e) => String(e.estado).toLowerCase() === "programado").length,
      activos: todosExamenes.filter((e) => String(e.estado).toLowerCase() === "activo").length,
      cerrados: todosExamenes.filter((e) => String(e.estado).toLowerCase() === "cerrado").length,
    };
  }, [todosExamenes]);

  const loadClases = async () => {
    if (!isDocente && !isAdmin) return;
    const res = await api.get("/api/docente/clases");
    const payload = unwrapResponse(res.data);
    const rows = Array.isArray(payload) ? payload : payload?.clases;
    setClases(safeArray(rows));
    return safeArray(rows);
  };

  const loadTodosExamenes = async (clasesData = null) => {
    const secciones = safeArray(clasesData || clases)
      .map((c) => Number(c.seccion_id))
      .filter((id) => id > 0);
    if (secciones.length === 0) {
      setTodosExamenes([]);
      return;
    }

    const promesas = secciones.map((sid) => api.get(`/api/examenes/seccion/${sid}`).catch(() => ({ data: [] })));
    const resultados = await Promise.all(promesas);

    const todosLosExamenes = [];
    resultados.forEach((res) => {
      const rows = unwrapResponse(res.data) || [];
      todosLosExamenes.push(...safeArray(rows));
    });

    // Ordenar por fecha de inicio descendente
    todosLosExamenes.sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));

    setTodosExamenes(todosLosExamenes);
  };

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      setError("No autorizado");
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const clasesData = await loadClases();
        await loadTodosExamenes(clasesData);
      } catch (e) {
        setError(e?.response?.data?.response || e?.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    })();
  }, [isStaff]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const clasesData = await loadClases();
      await loadTodosExamenes(clasesData);
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al refrescar");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDirect = async () => {
    if (!seccionParaCrear) {
      setError("Selecciona una clase primero");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const fechaInicio = now.toISOString().slice(0, 16).replace("T", " ") + ":00";

      const payload = {
        tipo: "parcial",
        parcial_id: 1,
        fecha_inicio: fechaInicio,
        duracion_min: 60,
        intentos_max: 1,
        modo_armado: "random",
        num_preguntas: 10,
        dificultad_min: 1,
        dificultad_max: 10,
        mezclar_preguntas: 1,
        mezclar_opciones: 1,
      };

      const res = await api.post(`/api/examenes/seccion/${seccionParaCrear}`, payload);
      const data = unwrapResponse(res.data);
      const createdId = Number(data?.id ?? 0);

      await refresh();
      setShowCreateModal(false);
      setSeccionParaCrear("");

      if (createdId > 0) {
        navigate(`/docente/examenes/${seccionParaCrear}/editor/${createdId}`);
      }
    } catch (e2) {
      setError(e2?.response?.data?.response || e2?.message || "No se pudo crear examen");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExamen = async () => {
    if (!examenAEliminar) return;

    setSaving(true);
    setError("");
    try {
      await api.delete(`/api/examenes/examen/${examenAEliminar.id}`);
      await loadTodosExamenes();
      setExamenAEliminar(null);
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroSeccion("");
    setFiltroEstado("");
    setFiltroBusqueda("");
  };

  const hayFiltrosActivos = filtroSeccion || filtroEstado || filtroBusqueda;

  const ExamenCard = ({ ex }) => {
    const sid = Number(ex?.seccion_id ?? 0);
    const clase = seccionMap.get(sid);
    const materiaNombre = clase?.materia?.nombre || `Materia #${ex?.materia_id ?? "-"}`;
    const grupo = clase?.grupo ? `Grupo ${clase.grupo}` : "";
    const periodo = clase?.periodo ? `${clase.periodo}` : "";
    const parcial = ex?.tipo === "parcial" ? (ex?.parcial_id ? `Parcial ${ex.parcial_id}` : "Parcial") : String(ex?.tipo || "Examen");

    const estado = String(ex?.estado || "").toLowerCase();
    const editable = puedeEditar(ex);
    const eliminable = puedeEliminar(ex);
    const haComenzado = examenHaComenzado(ex);

    const onClick = () => {
      if (estado === "cerrado") {
        navigate(`/docente/examenes/${sid}/resultados/${ex.id}`);
      } else {
        navigate(`/docente/examenes/${sid}/editor/${ex.id}`);
      }
    };

    return (
      <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-semibold text-slate-900 truncate">{materiaNombre}</div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(ex?.estado)}`}>
                {String(ex?.estado || "–")}
              </span>
              {estado === "programado" && haComenzado && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                  <Clock size={12} />
                  En curso
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-600 truncate">{[grupo, periodo, parcial].filter(Boolean).join(" · ")}</div>
          </button>

          {eliminable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExamenAEliminar(ex);
              }}
              disabled={saving}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
              title={estado === "borrador" ? "Eliminar borrador" : "Eliminar examen"}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 mt-2">
          <div className="text-xs font-medium text-slate-700">{formatMx(ex?.fecha_inicio)}</div>
          <div className="text-xs text-slate-500">{Number(ex?.duracion_min ?? 0) ? `${ex.duracion_min} min` : ""}</div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Intentos: <span className="font-medium text-slate-700">{ex?.intentos_max ?? "-"}</span>
            {" · "}
            Preguntas: <span className="font-medium text-slate-700">{ex?.num_preguntas ?? "-"}</span>
          </div>

          <div className="inline-flex items-center gap-1 text-xs font-medium text-brand-wine">
            {estado === "cerrado" ? (
              <>
                <BarChart3 size={14} /> Ver resultados
              </>
            ) : editable ? (
              <>
                <PencilLine size={14} /> Editar
              </>
            ) : (
              <>
                <FileText size={14} /> Ver detalles
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isStaff) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">No autorizado</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="text-brand-red" size={24} />
            <h1 className="text-2xl font-bold text-slate-900">Exámenes</h1>
          </div>
          <div className="mt-1 text-sm text-slate-600">Gestiona todos tus exámenes desde aquí</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline_secondary" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refrescar
          </Button>

          {(isAdmin || isDocente) && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2">
              <Plus size={16} />
              Nuevo examen
            </Button>
          )}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-600">Total</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="text-2xl font-bold text-amber-700">{stats.borradores}</div>
          <div className="text-xs text-amber-600">Borradores</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-700">{stats.programados}</div>
          <div className="text-xs text-green-600">Programados</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-700">{stats.activos}</div>
          <div className="text-xs text-blue-600">Activos</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-700">{stats.cerrados}</div>
          <div className="text-xs text-slate-600">Cerrados</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="ml-auto text-xs text-brand-red hover:underline inline-flex items-center gap-1"
            >
              <X size={12} />
              Limpiar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                placeholder="Materia, grupo, parcial..."
                className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              />
              {filtroBusqueda && (
                <button
                  type="button"
                  onClick={() => setFiltroBusqueda("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                >
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Clase</label>
            <select
              value={filtroSeccion || ""}
              onChange={(e) => setFiltroSeccion(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
            >
              <option value="">Todas las clases</option>
              {safeArray(clases).map((c) => (
                <option key={c.seccion_id} value={c.seccion_id}>
                  {c?.materia?.nombre || `Materia ${c?.materia_id}`} {c?.grupo ? `- ${c.grupo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
            <select
              value={filtroEstado || ""}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="programado">Programado</option>
              <option value="activo">Activo</option>
              <option value="cerrado">Cerrado</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-slate-600">
              {examenesConFiltros.length} de {todosExamenes.length} exámenes
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(error)}</div>}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton height={140} radius={16} />
          <Skeleton height={140} radius={16} />
          <Skeleton height={140} radius={16} />
          <Skeleton height={140} radius={16} />
        </div>
      )}

      {/* Contenido */}
      {!loading && (
        <div>
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setTab("activos")}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                tab === "activos" ? "bg-brand-red text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              ].join(" ")}
            >
              <PencilLine size={16} />
              Activos
              <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs">{activos.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("historial")}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                tab === "historial" ? "bg-brand-wine text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              ].join(" ")}
            >
              <History size={16} />
              Cerrados
              <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs">{historial.length}</span>
            </button>

            {archivados.length > 0 && (
              <button
                type="button"
                onClick={() => setTab("archivados")}
                className={[
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  tab === "archivados" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                ].join(" ")}
              >
                <Trash2 size={16} />
                Archivados
                <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs">{archivados.length}</span>
              </button>
            )}
          </div>

          {/* Cards */}
          {examenesToShow.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <div className="text-lg font-medium text-slate-900 mb-2">
                {hayFiltrosActivos ? "Sin resultados" : "No hay exámenes"}
              </div>
              <div className="text-sm text-slate-600 mb-4">
                {hayFiltrosActivos
                  ? "No hay exámenes que coincidan con los filtros aplicados."
                  : tab === "activos"
                  ? "Crea tu primer examen para comenzar."
                  : "No hay exámenes en esta categoría."}
              </div>
              {hayFiltrosActivos && (
                <Button variant="outline_secondary" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {examenesToShow.map((ex) => (
                <ExamenCard key={ex?.id} ex={ex} />
              ))}
            </div>
          )}
        </div>
      )}
      
      <ModalNuevoExamen
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        clases={clases}
        seccionParaCrear={seccionParaCrear}
        setSeccionParaCrear={setSeccionParaCrear}
        saving={saving}
        onCreate={handleCreateDirect}
      />

      {/* Modal para confirmar eliminación */}
      {examenAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Eliminar examen</h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              ¿Estás seguro de que deseas eliminar este examen? Esta acción lo archivará y ya no estará disponible para los alumnos.
            </p>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-4">
              <div className="text-sm font-medium text-slate-900">
                {examenAEliminar.tipo === "parcial"
                  ? `Parcial ${examenAEliminar.parcial_id || ""}`
                  : String(examenAEliminar.tipo || "Examen")}
              </div>
              <div className="text-xs text-slate-600">{formatMx(examenAEliminar.fecha_inicio)}</div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline_secondary" onClick={() => setExamenAEliminar(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteExamen} disabled={saving}>
                {saving ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}