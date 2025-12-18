// src/pages/ExamenesDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Table from "../components/ui/Table";
import { ArrowLeft, CalendarClock, History, PencilLine, Plus, RefreshCw, Wand2, Eye } from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

const EmptyState = ({ title, message }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-10 px-4">
    <div className="rounded-full bg-slate-100 p-4 mb-4">
      <History className="h-8 w-8 text-slate-500" />
    </div>
    <div className="text-base font-semibold text-slate-800">{title}</div>
    {message ? <div className="mt-1 text-sm text-slate-600 text-center max-w-xl">{message}</div> : null}
  </div>
);

function toDatetimeLocal(mysqlDt) {
  // "2025-12-15 13:05:00" -> "2025-12-15T13:05"
  if (!mysqlDt) return "";
  const s = String(mysqlDt).replace(" ", "T");
  return s.slice(0, 16);
}

function toMysqlDatetime(dtLocal) {
  // "2025-12-15T13:05" -> "2025-12-15 13:05:00"
  if (!dtLocal) return "";
  return String(dtLocal).replace("T", " ") + ":00";
}

function formatMx(mysqlDt) {
  if (!mysqlDt) return "-";
  // asume "YYYY-MM-DD HH:mm:ss"
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

function pickCreatedExamenId(res) {
  // createExamen devuelve $res del modelo; intentamos leer el id de varias formas
  const r = res || {};
  const direct = Number(r.id ?? r.examen_id ?? r.insert_id ?? r.insertId ?? 0);
  if (direct > 0) return direct;

  // a veces viene anidado
  const nested = r.response || r.data || r.payload || {};
  const nestedId = Number(nested.id ?? nested.examen_id ?? nested.insert_id ?? nested.insertId ?? 0);
  if (nestedId > 0) return nestedId;

  return 0;
}

export default function ExamenesDashboard({ currentUser }) {
  const params = useParams();
  const navigate = useNavigate();

  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isStaff = [1, 2, 3, 4].includes(roleId);

  const isDocente = roleId === 3 || roleId === 4;
  const isAdmin = roleId === 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [clases, setClases] = useState([]);
  const [selectedSeccionId, setSelectedSeccionId] = useState(Number(params?.seccionId ?? 0));

  const [tab, setTab] = useState("programados"); // programados | historial
  const [examenes, setExamenes] = useState([]);

  // Vistas internas
  const [view, setView] = useState("list"); // list | editor | historial | intento
  const [selectedExamen, setSelectedExamen] = useState(null);

  // Editor
  const [examenDetalle, setExamenDetalle] = useState(null);
  const [saving, setSaving] = useState(false);

  // Historial (intentos)
  const [intentos, setIntentos] = useState([]);
  const [selectedIntento, setSelectedIntento] = useState(null);
  const [intentoDetalle, setIntentoDetalle] = useState(null);

  // Modal crear examen
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    tipo: "parcial",
    parcial_id: "",
    fecha_inicio: "",
    duracion_min: 60,
    intentos_max: 1,
    modo_armado: "random",
    num_preguntas: 10,
    dificultad_min: 1,
    dificultad_max: 10,
    mezclar_preguntas: 1,
    mezclar_opciones: 1,
  });

  // Map seccion_id -> label con info (materia, grupo, periodo)
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
        carrera?.nombre ? `· ${carrera.nombre}` : ""
      ].filter(Boolean).join(" ");
      m.set(Number(c.seccion_id), { ...c, __label: label || `Sección ${c.seccion_id}` });
    }
    return m;
  }, [clases]);

  const selectedClase = useMemo(() => {
    return seccionMap.get(Number(selectedSeccionId)) || null;
  }, [seccionMap, selectedSeccionId]);

  const programados = useMemo(() => {
    return safeArray(examenes).filter((e) => String(e?.estado).toLowerCase() !== "cerrado" && String(e?.estado).toLowerCase() !== "archivado");
  }, [examenes]);

  const historial = useMemo(() => {
    return safeArray(examenes).filter((e) => String(e?.estado).toLowerCase() === "cerrado");
  }, [examenes]);

  const examenesToShow = tab === "historial" ? historial : programados;

  const resetSubViews = () => {
    setView("list");
    setSelectedExamen(null);
    setExamenDetalle(null);
    setIntentos([]);
    setSelectedIntento(null);
    setIntentoDetalle(null);
  };

  const loadClases = async () => {
    if (!isDocente && !isAdmin) return;
    const res = await api.get("/api/docente/clases");

    // Backend típico: { ok:true, docente_id, clases:[...] }
    const payload = unwrapResponse(res.data);
    const rows = Array.isArray(payload) ? payload : payload?.clases;

    setClases(safeArray(rows));
  };

  const loadExamenes = async (sid) => {
    if (!sid) {
      setExamenes([]);
      return;
    }
    const res = await api.get(`/api/examenes/seccion/${sid}`);
    const rows = unwrapResponse(res.data) || [];
    setExamenes(safeArray(rows));
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
        await loadClases();

        // default: si no viene seccionId en URL, usa la primera clase del docente
        const sidFromUrl = Number(params?.seccionId ?? 0);
        if (sidFromUrl > 0) {
          setSelectedSeccionId(sidFromUrl);
          await loadExamenes(sidFromUrl);
        } else {
          // si ya está en state (por rerender), úsala
          const currentSid = Number(selectedSeccionId ?? 0);
          if (currentSid > 0) {
            await loadExamenes(currentSid);
          } else {
            // toma primera clase (si existe)
            const first = safeArray(unwrapResponse((await api.get("/api/docente/clases")).data))[0];
            const sid = Number(first?.seccion_id ?? 0);
            if (sid > 0) {
              setSelectedSeccionId(sid);
              navigate(`/docente/examenes/${sid}`, { replace: true });
              await loadExamenes(sid);
            } else {
              setExamenes([]);
            }
          }
        }
      } catch (e) {
        setError(e?.response?.data?.response || e?.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.seccionId, isStaff]);

  const onChangeSeccion = async (sidRaw) => {
    const sid = Number(sidRaw);
    setSelectedSeccionId(sid);
    resetSubViews();
    if (sid > 0) navigate(`/docente/examenes/${sid}`);
    setLoading(true);
    setError("");
    try {
      await loadExamenes(sid);
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al cargar exámenes");
    } finally {
      setLoading(false);
    }
  };

  const openEditor = async (ex) => {
    const eid = Number(ex?.id ?? 0);
    if (!eid) return;
    setSelectedExamen(ex);
    setView("editor");
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/examenes/examen/${eid}`);
      const det = unwrapResponse(res.data);
      setExamenDetalle(det);
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al cargar examen");
    } finally {
      setLoading(false);
    }
  };

  const openHistorial = async (ex) => {
    const eid = Number(ex?.id ?? 0);
    if (!eid) return;
    setSelectedExamen(ex);
    setView("historial");
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/examenes/examen/${eid}/intentos`);
      setIntentos(safeArray(unwrapResponse(res.data)));
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al cargar intentos");
    } finally {
      setLoading(false);
    }
  };

  const openIntento = async (row) => {
    const iid = Number(row?.id ?? 0);
    if (!iid) return;
    setSelectedIntento(row);
    setView("intento");
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/examenes/intento/${iid}/detalle`);
      setIntentoDetalle(unwrapResponse(res.data));
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al cargar intento");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!selectedSeccionId) return;
    setLoading(true);
    setError("");
    try {
      await loadExamenes(selectedSeccionId);
      if (view === "editor" && selectedExamen?.id) {
        const res = await api.get(`/api/examenes/examen/${selectedExamen.id}`);
        setExamenDetalle(unwrapResponse(res.data));
      }
      if (view === "historial" && selectedExamen?.id) {
        const res = await api.get(`/api/examenes/examen/${selectedExamen.id}/intentos`);
        setIntentos(safeArray(unwrapResponse(res.data)));
      }
      if (view === "intento" && selectedIntento?.id) {
        const res = await api.get(`/api/examenes/intento/${selectedIntento.id}/detalle`);
        setIntentoDetalle(unwrapResponse(res.data));
      }
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al refrescar");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (!selectedSeccionId) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        parcial_id: form.parcial_id ? Number(form.parcial_id) : null,
        fecha_inicio: toMysqlDatetime(form.fecha_inicio),
        duracion_min: Number(form.duracion_min),
        intentos_max: Number(form.intentos_max),
        num_preguntas: Number(form.num_preguntas),
        dificultad_min: Number(form.dificultad_min),
        dificultad_max: Number(form.dificultad_max),
        mezclar_preguntas: Number(form.mezclar_preguntas),
        mezclar_opciones: Number(form.mezclar_opciones),
      };

      const res = await api.post(`/api/examenes/seccion/${selectedSeccionId}`, payload);
      const createdId = pickCreatedExamenId(unwrapResponse(res.data));
      setOpenCreate(false);

      // refresca lista
      await loadExamenes(selectedSeccionId);

      if (createdId > 0) {
        await openEditor({ id: createdId });
      }
    } catch (e2) {
      setError(e2?.response?.data?.response || e2?.message || "No se pudo crear examen");
    } finally {
      setSaving(false);
    }
  };

  const updateExamen = async (partial) => {
    const eid = Number(examenDetalle?.examen?.id ?? selectedExamen?.id ?? 0);
    if (!eid) return;

    setSaving(true);
    setError("");
    try {
      await api.put(`/api/examenes/examen/${eid}`, partial);
      // recarga detalle
      const res = await api.get(`/api/examenes/examen/${eid}`);
      setExamenDetalle(unwrapResponse(res.data));
      await loadExamenes(selectedSeccionId);
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  const actionArmar = async () => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/examenes/examen/${eid}/armar`);
      const res = await api.get(`/api/examenes/examen/${eid}`);
      setExamenDetalle(unwrapResponse(res.data));
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "No se pudo armar");
    } finally {
      setSaving(false);
    }
  };

  const actionPublicar = async () => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/examenes/examen/${eid}/publicar`);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "No se pudo publicar");
    } finally {
      setSaving(false);
    }
  };

  const actionCerrar = async () => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/examenes/examen/${eid}/cerrar`);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "No se pudo cerrar");
    } finally {
      setSaving(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (selectedClase?.__label) return selectedClase.__label;
    if (selectedSeccionId) return `Sección ${selectedSeccionId}`;
    return "Exámenes";
  }, [selectedClase, selectedSeccionId]);

  const ExamenCard = ({ ex }) => {
    const sid = Number(ex?.seccion_id ?? selectedSeccionId ?? 0);
    const clase = seccionMap.get(sid);
    const materiaNombre = clase?.materia?.nombre || `Materia #${ex?.materia_id ?? "-"}`;
    const grupo = clase?.grupo ? `Grupo ${clase.grupo}` : "";
    const periodo = clase?.periodo ? `${clase.periodo}` : "";
    const parcial = ex?.tipo === "parcial" ? (ex?.parcial_id ? `Parcial ${ex.parcial_id}` : "Parcial") : String(ex?.tipo || "Examen");

    const onClick = () => {
      const estado = String(ex?.estado || "").toLowerCase();
      if (estado === "cerrado") openHistorial(ex);
      else openEditor(ex);
    };

    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900 truncate">{materiaNombre}</div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(ex?.estado)}`}>
                {String(ex?.estado || "—")}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600 truncate">
              {[
                grupo,
                periodo,
                parcial
              ].filter(Boolean).join(" · ")}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="text-xs font-medium text-slate-700">{formatMx(ex?.fecha_inicio)}</div>
            <div className="text-xs text-slate-500">{Number(ex?.duracion_min ?? 0) ? `${ex.duracion_min} min` : ""}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Intentos máx: <span className="font-medium text-slate-700">{ex?.intentos_max ?? "-"}</span>
            {" · "}
            Preguntas: <span className="font-medium text-slate-700">{ex?.num_preguntas ?? "-"}</span>
          </div>

          <div className="inline-flex items-center gap-1 text-xs font-medium text-brand-wine">
            {String(ex?.estado || "").toLowerCase() === "cerrado" ? (
              <>
                <History size={16} /> Ver calificaciones
              </>
            ) : (
              <>
                <PencilLine size={16} /> Editar / previsualizar
              </>
            )}
          </div>
        </div>
      </button>
    );
  };

  const intentoColumns = useMemo(() => {
    return [
      { header: "ID", key: "id", accessor: "id", width: "72px" },
      { header: "Inscripción", accessor: "inscripcion_id", width: "110px" },
      { header: "Intento", accessor: "intento_num", width: "90px" },
      {
        header: "Estado",
        accessor: "estado",
        width: "120px",
        cell: (r) => (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(r?.estado)}`}>
            {String(r?.estado || "—")}
          </span>
        )
      },
      { header: "Calif. auto", accessor: "calif_auto", width: "110px" },
      { header: "Calif. final", accessor: "calif_final", width: "110px" },
      { header: "Enviado", accessor: "fin_real", cell: (r) => formatMx(r?.fin_real) },
      {
        header: "",
        key: "__open",
        sortable: false,
        width: "140px",
        truncate: false,
        cell: (r) => (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => openIntento(r)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Eye size={14} />
              Ver examen
            </button>
          </div>
        )
      }
    ];
  }, []);

  if (!isStaff) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No autorizado
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="text-brand-red" size={22} />
            <h1 className="text-xl font-semibold text-slate-900 truncate">Exámenes</h1>
          </div>
          <div className="mt-1 text-sm text-slate-600 truncate">
            {headerTitle}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline_secondary"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refrescar
          </Button>

          {(isAdmin || isDocente) && (
            <Button
              variant="primary"
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2"
              disabled={!selectedSeccionId || (isDocente && safeArray(clases).length === 0)}
            >
              <Plus size={16} />
              Crear examen
            </Button>
          )}
        </div>
      </div>

      {/* Selector de sección */}
      {(isAdmin || isDocente) && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              label="Clase / Sección"
              value={selectedSeccionId || ""}
              onChange={(e) => onChangeSeccion(e.target.value)}
            >
              <option value="">Selecciona una clase…</option>
              {safeArray(clases).map((c) => (
                <option key={c.seccion_id} value={c.seccion_id}>
                  {c?.materia?.nombre ? `${c.materia.nombre}` : `Materia ${c?.materia_id ?? ""}`}{" "}
                  {c?.grupo ? `- Grupo ${c.grupo}` : ""} {c?.periodo ? `(${c.periodo})` : ""}
                </option>
              ))}
            </Select>

            {isDocente && !loading && safeArray(clases).length === 0 ? (
              <div className="text-xs text-slate-600">
                No tienes clases asignadas en este periodo.
              </div>
            ) : null}

            <div className="hidden md:block" />
            <div className="hidden md:block" />
          </div>
        </div>
      )}

      {/* Mensajes */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {String(error)}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton height={120} radius={16} />
          <Skeleton height={120} radius={16} />
          <Skeleton height={120} radius={16} />
          <Skeleton height={120} radius={16} />
        </div>
      )}

      {/* Contenido */}
      {!loading && (
        <>
          {/* LISTA */}
          {view === "list" && (
            <div className="mt-6">
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab("programados")}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                    tab === "programados"
                      ? "bg-brand-red text-brand-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  ].join(" ")}
                >
                  <PencilLine size={16} />
                  Programados
                  <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                    {programados.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab("historial")}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                    tab === "historial"
                      ? "bg-brand-wine text-brand-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  ].join(" ")}
                >
                  <History size={16} />
                  Historial
                  <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                    {historial.length}
                  </span>
                </button>
              </div>

              {/* Cards */}
              {examenesToShow.length === 0 ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  No hay exámenes en esta pestaña.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {examenesToShow.map((ex) => (
                    <ExamenCard key={ex?.id} ex={ex} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EDITOR / PREVIEW */}
          {view === "editor" && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline_secondary"
                  onClick={() => {
                    resetSubViews();
                    setTab("programados");
                  }}
                  className="inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Volver
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline_primary"
                    onClick={actionArmar}
                    disabled={saving}
                    className="inline-flex items-center gap-2"
                  >
                    <Wand2 size={16} />
                    Armar (random)
                  </Button>

                  <Button
                    variant="primary"
                    onClick={actionPublicar}
                    disabled={saving}
                  >
                    Publicar
                  </Button>

                  <Button
                    variant="outline_danger"
                    onClick={actionCerrar}
                    disabled={saving}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        Examen #{examenDetalle?.examen?.id ?? selectedExamen?.id ?? "-"}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Estado:{" "}
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(examenDetalle?.examen?.estado)}`}>
                          {String(examenDetalle?.examen?.estado || "—")}
                        </span>
                        {" · "}
                        Fecha: <span className="font-medium">{formatMx(examenDetalle?.examen?.fecha_inicio)}</span>
                        {" · "}
                        Duración: <span className="font-medium">{examenDetalle?.examen?.duracion_min ?? "-"} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Select
                      label="Tipo"
                      value={examenDetalle?.examen?.tipo ?? "parcial"}
                      onChange={(e) => updateExamen({ tipo: e.target.value })}
                      disabled={saving}
                    >
                      <option value="parcial">Parcial</option>
                      <option value="final">Final</option>
                      <option value="diagnostico">Diagnóstico</option>
                    </Select>

                    <Input
                      label="Parcial ID (si aplica)"
                      value={examenDetalle?.examen?.parcial_id ?? ""}
                      onChange={(e) => updateExamen({ parcial_id: e.target.value ? Number(e.target.value) : null })}
                      disabled={saving}
                      placeholder="1, 2, 3..."
                    />

                    <Input
                      label="Fecha y hora"
                      type="datetime-local"
                      value={toDatetimeLocal(examenDetalle?.examen?.fecha_inicio)}
                      onChange={(e) => updateExamen({ fecha_inicio: toMysqlDatetime(e.target.value) })}
                      disabled={saving}
                    />

                    <Input
                      label="Duración (min)"
                      type="number"
                      min={1}
                      value={examenDetalle?.examen?.duracion_min ?? 60}
                      onChange={(e) => updateExamen({ duracion_min: Number(e.target.value) })}
                      disabled={saving}
                    />

                    <Input
                      label="Intentos máximos"
                      type="number"
                      min={1}
                      value={examenDetalle?.examen?.intentos_max ?? 1}
                      onChange={(e) => updateExamen({ intentos_max: Number(e.target.value) })}
                      disabled={saving}
                    />

                    <Select
                      label="Modo armado"
                      value={examenDetalle?.examen?.modo_armado ?? "random"}
                      onChange={(e) => updateExamen({ modo_armado: e.target.value })}
                      disabled={saving}
                    >
                      <option value="random">Random</option>
                      <option value="manual">Manual</option>
                    </Select>

                    <Input
                      label="Número de preguntas"
                      type="number"
                      min={1}
                      value={examenDetalle?.examen?.num_preguntas ?? 10}
                      onChange={(e) => updateExamen({ num_preguntas: Number(e.target.value) })}
                      disabled={saving}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Dificultad min"
                        type="number"
                        min={1}
                        max={10}
                        value={examenDetalle?.examen?.dificultad_min ?? 1}
                        onChange={(e) => updateExamen({ dificultad_min: Number(e.target.value) })}
                        disabled={saving}
                      />
                      <Input
                        label="Dificultad max"
                        type="number"
                        min={1}
                        max={10}
                        value={examenDetalle?.examen?.dificultad_max ?? 10}
                        onChange={(e) => updateExamen({ dificultad_max: Number(e.target.value) })}
                        disabled={saving}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Mezclar preguntas"
                        value={Number(examenDetalle?.examen?.mezclar_preguntas ?? 1)}
                        onChange={(e) => updateExamen({ mezclar_preguntas: Number(e.target.value) })}
                        disabled={saving}
                      >
                        <option value={1}>Sí</option>
                        <option value={0}>No</option>
                      </Select>
                      <Select
                        label="Mezclar opciones"
                        value={Number(examenDetalle?.examen?.mezclar_opciones ?? 1)}
                        onChange={(e) => updateExamen({ mezclar_opciones: Number(e.target.value) })}
                        disabled={saving}
                      >
                        <option value={1}>Sí</option>
                        <option value={0}>No</option>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Tip: para “sustituir preguntas” rápido, cambia filtros (dificultad / #preguntas) y vuelve a dar <b>Armar (random)</b>.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Preguntas del examen</div>
                  <div className="mt-2 text-xs text-slate-600">
                    {safeArray(examenDetalle?.preguntas).length} preguntas armadas
                  </div>

                  <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-slate-100">
                    {safeArray(examenDetalle?.preguntas).length === 0 ? (
                      <div className="p-3 text-sm text-slate-600">
                        Aún no hay preguntas armadas. Dale a <b>Armar (random)</b>.
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {safeArray(examenDetalle?.preguntas).map((p, idx) => (
                          <li key={p?.id ?? idx} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-slate-800">
                                #{p?.orden_base ?? idx + 1} · PV {p?.pregunta_version_id}
                              </div>
                              <div className="text-xs text-slate-500">
                                Puntos: {p?.puntos ?? 1}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HISTORIAL */}
          {view === "historial" && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline_secondary"
                  onClick={() => {
                    resetSubViews();
                    setTab("historial");
                  }}
                  className="inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Volver
                </Button>

                <div className="text-sm text-slate-600">
                  Examen #{selectedExamen?.id ?? "-"} · Intentos:{" "}
                  <span className="font-semibold text-slate-900">{safeArray(intentos).length}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Table
                  columns={intentoColumns}
                  rows={safeArray(intentos)}
                  actions={{ show: false }}
                  defaultSort={{ accessor: "created_at", direction: "desc" }}
                />
                <div className="mt-3 text-xs text-slate-500">
                  Nota: este endpoint regresa la tabla <code>examen_intento</code> tal cual; si quieres nombre/matrícula del alumno aquí, conviene que el backend haga un JOIN.
                </div>
              </div>
            </div>
          )}

          {/* INTENTO DETALLE */}
          {view === "intento" && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline_secondary"
                  onClick={() => {
                    setView("historial");
                    setIntentoDetalle(null);
                    setSelectedIntento(null);
                  }}
                  className="inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Volver a calificaciones
                </Button>

                <div className="text-sm text-slate-600">
                  Intento #{selectedIntento?.id ?? "-"} · Estado:{" "}
                  <span className="font-semibold text-slate-900">{selectedIntento?.estado ?? "-"}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Examen #{intentoDetalle?.examen?.id ?? "-"}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Calif. auto: <span className="font-medium">{intentoDetalle?.intento?.calif_auto ?? "-"}</span>
                      {" · "}
                      Calif. final: <span className="font-medium">{intentoDetalle?.intento?.calif_final ?? "-"}</span>
                      {" · "}
                      Enviado: <span className="font-medium">{formatMx(intentoDetalle?.intento?.fin_real)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {safeArray(intentoDetalle?.preguntas).length === 0 ? (
                    <div className="text-sm text-slate-600">Sin detalle de preguntas.</div>
                  ) : (
                    safeArray(intentoDetalle?.preguntas).map((p, idx) => {
                      const pvId = Number(p?.pregunta_version_id ?? 0);
                      const resp = safeArray(intentoDetalle?.respuestas).find(r => Number(r?.pregunta_version_id ?? 0) === pvId);

                      return (
                        <div key={p?.id ?? idx} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">
                              Pregunta #{p?.orden ?? idx + 1} · PV {pvId || "-"}
                            </div>
                            <div className="text-xs text-slate-600">
                              Puntaje auto: <span className="font-semibold">{resp?.puntaje_auto ?? "-"}</span>
                              {resp?.puntaje_manual != null ? (
                                <>
                                  {" · "}
                                  Puntaje manual: <span className="font-semibold">{resp?.puntaje_manual}</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-slate-600">
                            Estado revisión: <span className="font-medium">{resp?.estado_revision ?? "-"}</span>
                          </div>

                          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-800">
                            {resp?.respuesta_texto ? (
                              <div>
                                <div className="text-xs font-semibold text-slate-600">Respuesta (texto)</div>
                                <div className="mt-1 whitespace-pre-wrap">{String(resp.respuesta_texto)}</div>
                              </div>
                            ) : resp?.respuesta_json ? (
                              <div>
                                <div className="text-xs font-semibold text-slate-600">Respuesta (json)</div>
                                <pre className="mt-1 overflow-auto text-xs">{String(resp.respuesta_json)}</pre>
                              </div>
                            ) : (
                              <div className="text-slate-500">Sin respuesta</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL CREAR */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Crear examen">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Tipo"
              value={form.tipo}
              onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
            >
              <option value="parcial">Parcial</option>
              <option value="final">Final</option>
              <option value="diagnostico">Diagnóstico</option>
            </Select>

            <Input
              label="Parcial ID (si aplica)"
              placeholder="1, 2, 3..."
              value={form.parcial_id}
              onChange={(e) => setForm((p) => ({ ...p, parcial_id: e.target.value }))}
            />

            <Input
              label="Fecha y hora"
              type="datetime-local"
              value={form.fecha_inicio}
              onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
              required
            />

            <Input
              label="Duración (min)"
              type="number"
              min={1}
              value={form.duracion_min}
              onChange={(e) => setForm((p) => ({ ...p, duracion_min: e.target.value }))}
            />

            <Input
              label="Intentos máximos"
              type="number"
              min={1}
              value={form.intentos_max}
              onChange={(e) => setForm((p) => ({ ...p, intentos_max: e.target.value }))}
            />

            <Select
              label="Modo armado"
              value={form.modo_armado}
              onChange={(e) => setForm((p) => ({ ...p, modo_armado: e.target.value }))}
            >
              <option value="random">Random</option>
              <option value="manual">Manual</option>
            </Select>

            <Input
              label="# Preguntas"
              type="number"
              min={1}
              value={form.num_preguntas}
              onChange={(e) => setForm((p) => ({ ...p, num_preguntas: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Dificultad min"
                type="number"
                min={1}
                max={10}
                value={form.dificultad_min}
                onChange={(e) => setForm((p) => ({ ...p, dificultad_min: e.target.value }))}
              />
              <Input
                label="Dificultad max"
                type="number"
                min={1}
                max={10}
                value={form.dificultad_max}
                onChange={(e) => setForm((p) => ({ ...p, dificultad_max: e.target.value }))}
              />
            </div>

            <Select
              label="Mezclar preguntas"
              value={form.mezclar_preguntas}
              onChange={(e) => setForm((p) => ({ ...p, mezclar_preguntas: Number(e.target.value) }))}
            >
              <option value={1}>Sí</option>
              <option value={0}>No</option>
            </Select>

            <Select
              label="Mezclar opciones"
              value={form.mezclar_opciones}
              onChange={(e) => setForm((p) => ({ ...p, mezclar_opciones: Number(e.target.value) }))}
            >
              <option value={1}>Sí</option>
              <option value={0}>No</option>
            </Select>
          </div>


          {isDocente && safeArray(clases).length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No tienes clases asignadas, así que no puedes crear exámenes por ahora.
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline_secondary" type="button" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="inline-flex items-center gap-2"
              disabled={saving || (isDocente && safeArray(clases).length === 0)}
            >
              <Plus size={16} />
              Crear y editar
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Al crear, te llevo directo a la vista de previsualización/editor para armar y ajustar el examen.
          </div>
        </form>
      </Modal>
    </div>
  );
}
