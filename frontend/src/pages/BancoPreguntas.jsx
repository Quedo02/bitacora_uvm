// src/pages/BancoPreguntas.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Table from "../components/ui/Table";

import { BookOpen, RefreshCw, Plus, CheckCircle2, Eye, PencilLine, Inbox } from "lucide-react";
import ModalNuevaPregunta from '../components/banco/ModalNuevaPregunta';
import ModalVerRespuestas from '../components/banco/ModalVerRespuestas';
import ModalRevisar from '../components/banco/ModalRevisar';

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function materiaLabel(m) {
  const codigo = m?.codigo ?? m?.codigo_materia ?? m?.codigoMateria ?? "";
  const nombre = m?.nombre ?? m?.nombre_materia ?? m?.nombreMateria ?? "";
  const label = [codigo, nombre].filter(Boolean).join(" — ");
  return label || `Materia #${m?.id ?? "?"}`;
}

export default function BancoPreguntas({ currentUser }) {
  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isAllowed = roleId !== 5 && roleId !== 0;
  const canApprove = roleId === 1 || roleId === 2 || roleId === 3;

  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("preguntas");

  const [materias, setMaterias] = useState([]);
  const [temas, setTemas] = useState([]);
  const [materiaId, setMateriaId] = useState("");

  const [preguntas, setPreguntas] = useState([]);
  const [estado, setEstado] = useState("todas");
  const [temaId, setTemaId] = useState("");

  const [pendientes, setPendientes] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  const [loadingMaterias, setLoadingMaterias] = useState(true);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [loadingPendientes, setLoadingPendientes] = useState(false);

  const [showModalNueva, setShowModalNueva] = useState(false);
  const [showModalRespuestas, setShowModalRespuestas] = useState(false);
  const [showModalRevisar, setShowModalRevisar] = useState(false);
  const [selectedPreguntaId, setSelectedPreguntaId] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  const materiaMap = useMemo(() => {
    const map = new Map();
    safeArray(materias).forEach((m) => map.set(String(m?.id), materiaLabel(m)));
    return map;
  }, [materias]);

  const getMateriaText = (row) => {
    const obj = row?.materia ?? row?.materia_obj ?? null;
    if (obj) return materiaLabel(obj);

    const id = row?.materia_id ?? row?.materiaId ?? row?.materia ?? null;
    if (id == null) return "—";
    return materiaMap.get(String(id)) ?? `Materia #${id}`;
  };

  async function loadMaterias() {
    const { data } = await api.get("/api/banco/materias");
    const resp = unwrapResponse(data);
    const list = safeArray(resp);

    setMaterias(list);
    setMateriaId((prev) => {
      const prevStr = String(prev || "");
      const keep = prevStr && list.some((m) => String(m?.id) === prevStr);
      if (keep) return prevStr;
      return list?.[0]?.id ? String(list[0].id) : "";
    });
  }

  async function loadTemas(mId) {
    if (!mId) {
      setTemas([]);
      setTemaId("");
      return;
    }
    const { data } = await api.get(`/api/banco/materia/${mId}/temas`);
    const resp = unwrapResponse(data);
    const list = safeArray(resp);
    setTemas(list);

    setTemaId((prev) => {
      const prevStr = String(prev || "");
      const keep = prevStr && list.some((t) => String(t?.id) === prevStr);
      return keep ? prevStr : "";
    });
  }

  async function loadPreguntas() {
    if (!materiaId) {
      setPreguntas([]);
      return;
    }
    const params = new URLSearchParams();
    params.set("materia_id", materiaId);
    if (estado && estado !== "todas") params.set("estado", estado);
    if (temaId) params.set("tema_id", temaId);

    const { data } = await api.get(`/api/banco/preguntas`);
    const resp = unwrapResponse(data);
    setPreguntas(safeArray(resp));
  }

  async function loadPendientes() {
    if (!canApprove) {
      setPendientes([]);
      return;
    }
    const { data } = await api.get("/api/banco/aprobaciones/pendientes");
    const resp = unwrapResponse(data);
    setPendientes(safeArray(resp));
  }

  useEffect(() => {
    if (!isAllowed) return;

    setError("");
    setLoadingMaterias(true);

    loadMaterias()
      .catch(() => setError("No se pudieron cargar materias"))
      .finally(() => setLoadingMaterias(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, refreshTick]);

  useEffect(() => {
    if (!materiaId) {
      setTemas([]);
      setTemaId("");
      return;
    }

    setTemaId("");
    loadTemas(materiaId).catch(() => setTemas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaId]);

  useEffect(() => {
    if (!isAllowed) return;

    setLoadingPreguntas(true);
    loadPreguntas()
      .catch(() => setPreguntas([]))
      .finally(() => setLoadingPreguntas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaId, estado, temaId, refreshTick]);

  useEffect(() => {
    if (!isAllowed) return;
    if (!canApprove) {
      setPendientes([]);
      return;
    }

    setLoadingPendientes(true);
    loadPendientes()
      .catch(() => setPendientes([]))
      .finally(() => setLoadingPendientes(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApprove, refreshTick]);

  const preguntasRows = useMemo(() => safeArray(preguntas), [preguntas]);
  const pendientesRows = useMemo(() => safeArray(pendientes), [pendientes]);

  const maxEnunciadoLength = useMemo(() => {
    const rows = activeTab === "preguntas" ? preguntasRows : pendientesRows;
    if (rows.length === 0) return 300;
    
    const maxLen = Math.max(
      ...rows.map(r => String(r.enunciado ?? "").length)
    );
    
    const calculatedWidth = Math.min(Math.max(maxLen * 8, 200), 600);
    return calculatedWidth;
  }, [preguntasRows, pendientesRows, activeTab]);

  const badge = (value) => {
    const v = String(value ?? "").toLowerCase();
    const cls =
      v === "aprobada"
        ? "bg-emerald-100 text-emerald-800"
        : v === "rechazada"
        ? "bg-rose-100 text-rose-800"
        : v === "revision"
        ? "bg-amber-100 text-amber-800"
        : v === "pendiente"
        ? "bg-sky-100 text-sky-800"
        : "bg-slate-100 text-slate-800";

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
        {value ?? "—"}
      </span>
    );
  };

  const preguntasColumns = useMemo(
    () => [
      {
        header: "Materia",
        accessor: "materia_id",
        width: "200px",
        cell: (row) => (
          <span className="text-sm text-slate-800">{getMateriaText(row)}</span>
        ),
      },
      {
        header: "Enunciado",
        accessor: "enunciado",
        width: `${maxEnunciadoLength}px`,
        cell: (row) => (
          <div className="text-sm text-slate-800">{row.enunciado}</div>
        ),
      },
      { 
        header: "Tipo", 
        accessor: "tipo", 
        width: "120px",
        cell: (row) => (
          <span className="text-sm text-slate-700">{row.tipo}</span>
        ),
      },
      { 
        header: "Dificultad", 
        accessor: "dificultad", 
        width: "100px",
        cell: (row) => (
          <span className="text-sm text-slate-700">{row.dificultad}</span>
        ),
      },
      { 
        header: "Scope", 
        accessor: "scope", 
        width: "100px",
        cell: (row) => (
          <span className="text-sm text-slate-700">{row.scope}</span>
        ),
      },
      { 
        header: "Parcial", 
        accessor: "parcial_id", 
        width: "80px",
        cell: (row) => (
          <span className="text-sm text-slate-700">{row.parcial_id || "—"}</span>
        ),
      },
      {
        header: "Acciones",
        accessor: null,
        sortable: false,
        width: "220px",
        truncate: false,
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="outline_secondary" 
              size="sm" 
              onClick={() => {
                setSelectedPreguntaId(row.id);
                setShowModalRespuestas(true);
              }} 
              className="gap-1"
            >
              <Eye className="h-4 w-4" />
              Respuestas
            </Button>
            <Button 
              variant="outline_primary" 
              size="sm" 
              onClick={() => {
                setSelectedPreguntaId(row.id);
                setShowModalRespuestas(true);
              }} 
              className="gap-1"
            >
              <PencilLine className="h-4 w-4" />
              Proponer
            </Button>
          </div>
        ),
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materiaMap, maxEnunciadoLength]
  );

  const pendientesColumns = useMemo(
    () => [
      {
        header: "Enunciado",
        accessor: "enunciado",
        width: `${maxEnunciadoLength}px`,
        cell: (row) => (
          <div className="text-sm text-slate-800">{row.enunciado ?? ""}</div>
        ),
      },
      {
        header: "Materia",
        accessor: "materia_id",
        width: "200px",
        cell: (row) => (
          <span className="text-sm text-slate-800">{getMateriaText(row)}</span>
        ),
      },
      { 
        header: "Tipo", 
        accessor: "tipo", 
        width: "120px",
        cell: (row) => (
          <span className="text-sm text-slate-700">{row.tipo}</span>
        ),
      },
      {
        header: "Estado",
        accessor: "estado",
        width: "120px",
        cell: (row) => badge(row.estado),
      },
      {
        header: "Acciones",
        accessor: null,
        sortable: false,
        width: "260px",
        truncate: false,
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="outline_primary" 
              size="sm" 
              onClick={() => {
                setSelectedVersionId(row.id);
                setShowModalRevisar(true);
              }} 
              className="gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              Revisar
            </Button>
            <Button 
              variant="outline_secondary" 
              size="sm" 
              onClick={() => {
                setSelectedPreguntaId(row.pregunta_id);
                setShowModalRespuestas(true);
              }} 
              className="gap-1"
            >
              <Eye className="h-4 w-4" />
              Respuestas
            </Button>
          </div>
        ),
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materiaMap, maxEnunciadoLength]
  );

  if (!isAllowed) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">No autorizado</div>
          <div className="mt-1 text-sm text-slate-600">
            Tu rol no tiene acceso al banco de preguntas.
          </div>
        </div>
      </div>
    );
  }

  const selectedMateria = materias.find((m) => String(m?.id) === String(materiaId));

  const EmptyState = ({ title, message }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-full bg-slate-100 p-4 mb-4">
        <Inbox className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 text-center max-w-sm">{message}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-brand-red" />
          <h1 className="text-lg font-semibold text-slate-900">Banco de preguntas</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline_secondary"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </Button>

          <Button variant="primary" className="gap-2" onClick={() => setShowModalNueva(true)}>
            <Plus className="h-4 w-4" />
            Nueva pregunta
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Filtros</div>
            <div className="text-xs text-slate-500">Materia, tema y estado</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Materia</span>
            <select
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
              disabled={loadingMaterias}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red disabled:bg-slate-50"
            >
              {materias.length === 0 ? (
                <option value="">
                  {loadingMaterias ? "Cargando materias..." : "Sin materias"}
                </option>
              ) : (
                materias.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {materiaLabel(m)}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Tema</span>
            <select
              value={temaId}
              onChange={(e) => setTemaId(e.target.value)}
              disabled={!materiaId}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red disabled:bg-slate-50"
            >
              <option value="">Todos</option>
              {temas.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {(t.parcial_id ? `P${t.parcial_id} · ` : "") + (t.nombre ?? "")}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Estado</span>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
            >
              <option value="todas">Todas</option>
              <option value="aprobada">Aprobadas</option>
              <option value="revision">En revisión</option>
              <option value="rechazada">Rechazadas</option>
              <option value="archivada">Archivadas</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("preguntas")}
              className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "preguntas"
                  ? "text-brand-red border-b-2 border-brand-red"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Preguntas
            </button>

            {canApprove && (
              <button
                onClick={() => setActiveTab("pendientes")}
                className={`relative px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "pendientes"
                    ? "text-brand-red border-b-2 border-brand-red"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pendientes por aprobar
                {pendientesRows.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-red text-white text-xs font-semibold">
                    {pendientesRows.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {activeTab === "preguntas" ? (
            <>
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">Preguntas</div>
                <div className="text-xs text-slate-500">
                  {selectedMateria ? materiaLabel(selectedMateria) : "—"} · {preguntasRows.length} resultados
                </div>
              </div>

              {loadingMaterias || loadingPreguntas ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : preguntasRows.length === 0 ? (
                <EmptyState
                  title="No hay preguntas disponibles"
                  message="No se encontraron preguntas con los filtros seleccionados. Intenta cambiar la materia, tema o estado para ver más resultados."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table columns={preguntasColumns} rows={preguntasRows} actions={{ show: false }} />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">Pendientes por aprobar</div>
                <div className="text-xs text-slate-500">{pendientesRows.length} pendientes</div>
              </div>

              {loadingPendientes ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : pendientesRows.length === 0 ? (
                <EmptyState
                  title="¡Todo al día!"
                  message="No hay preguntas pendientes por revisar en este momento. Todas las propuestas han sido procesadas."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table columns={pendientesColumns} rows={pendientesRows} actions={{ show: false }} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ModalNuevaPregunta
        open={showModalNueva}
        onClose={() => setShowModalNueva(false)}
        materiaId={materiaId}
        materiaNombre={selectedMateria ? selectedMateria.nombre_materia : ""}
        onSuccess={() => {
          setRefreshTick(t => t + 1);
        }}
      />

      <ModalVerRespuestas
        open={showModalRespuestas}
        onClose={() => {
          setShowModalRespuestas(false);
          setSelectedPreguntaId(null);
        }}
        preguntaId={selectedPreguntaId}
      />

      <ModalRevisar
        open={showModalRevisar}
        onClose={() => {
          setShowModalRevisar(false);
          setSelectedVersionId(null);
        }}
        preguntaVersionId={selectedVersionId}
        onSuccess={() => {
          setRefreshTick(t => t + 1);
        }}
      />
    </div>
  );
}