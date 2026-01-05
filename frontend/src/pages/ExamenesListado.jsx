// src/pages/examenes/ExamenesListado.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import { ArrowLeft, CalendarClock, History, PencilLine, Plus, RefreshCw, Eye } from "lucide-react";

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

function pickCreatedExamenId(res) {
  const r = res || {};
  const direct = Number(r.id ?? r.examen_id ?? r.insert_id ?? r.insertId ?? 0);
  if (direct > 0) return direct;
  const nested = r.response || r.data || r.payload || {};
  const nestedId = Number(nested.id ?? nested.examen_id ?? nested.insert_id ?? nested.insertId ?? 0);
  if (nestedId > 0) return nestedId;
  return 0;
}

export default function ExamenesListado({ currentUser }) {
  const params = useParams();
  const navigate = useNavigate();

  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isDocente = roleId === 3 || roleId === 4;
  const isAdmin = roleId === 1;
  const isStaff = [1, 2, 3, 4].includes(roleId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [clases, setClases] = useState([]);
  const [selectedSeccionId, setSelectedSeccionId] = useState(Number(params?.seccionId ?? 0));
  const [examenes, setExamenes] = useState([]);
  const [tab, setTab] = useState("programados");

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
    return safeArray(examenes).filter(
      (e) => String(e?.estado).toLowerCase() !== "cerrado" && String(e?.estado).toLowerCase() !== "archivado"
    );
  }, [examenes]);

  const historial = useMemo(() => {
    return safeArray(examenes).filter((e) => String(e?.estado).toLowerCase() === "cerrado");
  }, [examenes]);

  const examenesToShow = tab === "historial" ? historial : programados;

  const loadClases = async () => {
    if (!isDocente && !isAdmin) return;
    const res = await api.get("/api/docente/clases");
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
        const sidFromUrl = Number(params?.seccionId ?? 0);
        if (sidFromUrl > 0) {
          setSelectedSeccionId(sidFromUrl);
          await loadExamenes(sidFromUrl);
        } else {
          const currentSid = Number(selectedSeccionId ?? 0);
          if (currentSid > 0) {
            await loadExamenes(currentSid);
          } else {
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
  }, [params?.seccionId, isStaff]);

  const onChangeSeccion = async (sidRaw) => {
    const sid = Number(sidRaw);
    setSelectedSeccionId(sid);
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

  const refresh = async () => {
    if (!selectedSeccionId) return;
    setLoading(true);
    setError("");
    try {
      await loadExamenes(selectedSeccionId);
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al refrescar");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDirect = async () => {
    if (!selectedSeccionId) {
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
        mezclar_opciones: 1
      };

      const res = await api.post(`/api/examenes/seccion/${selectedSeccionId}`, payload);
      const createdId = pickCreatedExamenId(unwrapResponse(res.data));

      await loadExamenes(selectedSeccionId);

      if (createdId > 0) {
        navigate(`/docente/examenes/${selectedSeccionId}/editor/${createdId}`);
      }
    } catch (e2) {
      setError(e2?.response?.data?.response || e2?.message || "No se pudo crear examen");
    } finally {
      setSaving(false);
    }
  };

  const ExamenCard = ({ ex }) => {
    const sid = Number(ex?.seccion_id ?? selectedSeccionId ?? 0);
    const clase = seccionMap.get(sid);
    const materiaNombre = clase?.materia?.nombre || `Materia #${ex?.materia_id ?? "-"}`;
    const grupo = clase?.grupo ? `Grupo ${clase.grupo}` : "";
    const periodo = clase?.periodo ? `${clase.periodo}` : "";
    const parcial = ex?.tipo === "parcial" ? (ex?.parcial_id ? `Parcial ${ex.parcial_id}` : "Parcial") : String(ex?.tipo || "Examen");

    const onClick = () => {
      const estado = String(ex?.estado || "").toLowerCase();
      if (estado === "cerrado") {
        navigate(`/docente/examenes/${sid}/resultados/${ex.id}`);
      } else {
        navigate(`/docente/examenes/${sid}/editor/${ex.id}`);
      }
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
                {String(ex?.estado || "–")}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600 truncate">{[grupo, periodo, parcial].filter(Boolean).join(" · ")}</div>
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
                <History size={16} /> Ver resultados
              </>
            ) : (
              <>
                <PencilLine size={16} /> Editar
              </>
            )}
          </div>
        </div>
      </button>
    );
  };

  const headerTitle = useMemo(() => {
    if (selectedClase?.__label) return selectedClase.__label;
    if (selectedSeccionId) return `Sección ${selectedSeccionId}`;
    return "Exámenes";
  }, [selectedClase, selectedSeccionId]);

  if (!isStaff) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">No autorizado</div>
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
          <div className="mt-1 text-sm text-slate-600 truncate">{headerTitle}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline_secondary" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2">
            <RefreshCw size={16} />
            Refrescar
          </Button>

          {(isAdmin || isDocente) && (
            <Button
              variant="primary"
              onClick={handleCreateDirect}
              className="inline-flex items-center gap-2"
              disabled={!selectedSeccionId || saving || (isDocente && safeArray(clases).length === 0)}
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
            <Select label="Clase / Sección" value={selectedSeccionId || ""} onChange={(e) => onChangeSeccion(e.target.value)}>
              <option value="">Selecciona una clase…</option>
              {safeArray(clases).map((c) => (
                <option key={c.seccion_id} value={c.seccion_id}>
                  {c?.materia?.nombre ? `${c.materia.nombre}` : `Materia ${c?.materia_id ?? ""}`} {c?.grupo ? `- Grupo ${c.grupo}` : ""}{" "}
                  {c?.periodo ? `(${c.periodo})` : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* Mensajes */}
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(error)}</div>}

      {/* Loading */}
      {loading && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton height={120} radius={16} />
          <Skeleton height={120} radius={16} />
        </div>
      )}

      {/* Contenido */}
      {!loading && (
        <div className="mt-6">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("programados")}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                tab === "programados" ? "bg-brand-red text-brand-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              ].join(" ")}
            >
              <PencilLine size={16} />
              Activos
              <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs">{programados.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("historial")}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                tab === "historial" ? "bg-brand-wine text-brand-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              ].join(" ")}
            >
              <History size={16} />
              Cerrados
              <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs">{historial.length}</span>
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
    </div>
  );
}