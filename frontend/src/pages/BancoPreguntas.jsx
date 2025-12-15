// src/pages/BancoPreguntas.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Table from "../components/ui/Table";
import { BookOpen, CheckCircle2, RefreshCw, Plus } from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function prettyJSON(v) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function parseJSON(txt, fallback = {}) {
  try {
    const v = JSON.parse(txt || "{}");
    return v && typeof v === "object" ? v : fallback;
  } catch {
    return fallback;
  }
}

export default function BancoPreguntas({ currentUser }) {
  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isAllowed = roleId !== 5 && roleId !== 0;

  const canApprove = roleId === 1 || roleId === 2 || roleId === 3;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [materias, setMaterias] = useState([]);
  const [temas, setTemas] = useState([]);
  const [materiaId, setMateriaId] = useState("");

  const [preguntas, setPreguntas] = useState([]);
  const [estado, setEstado] = useState("todas");
  const [temaId, setTemaId] = useState("");

  const [pendientes, setPendientes] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // modal crear
  const [openCreate, setOpenCreate] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createForm, setCreateForm] = useState({
    tipo: "opcion_multiple",
    enunciado: "",
    dificultad: 5,
    scope: "parcial",
    parcial_id: 1,
    tema_ids: [],
    contenido_txt: prettyJSON({
      opciones: ["A", "B", "C", "D"],
      multiple: false,
    }),
    respuesta_txt: prettyJSON({
      correcta: [0],
    }),
  });

  // modal voto
  const [openVote, setOpenVote] = useState(false);
  const [voteErr, setVoteErr] = useState("");
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteTarget, setVoteTarget] = useState(null); // {pv_id, pregunta_id, materia_id}
  const [voteAreas, setVoteAreas] = useState([]);
  const [voteForm, setVoteForm] = useState({
    decision: "aprobar",
    area_id: "",
    comentario: "",
  });

  const tipoOptions = [
    { value: "opcion_multiple", label: "Opción múltiple" },
    { value: "verdadero_falso", label: "Verdadero/Falso" },
    { value: "abierta", label: "Abierta" },
    { value: "relacionar", label: "Relacionar" },
    { value: "ordenar", label: "Ordenar" },
    { value: "completar", label: "Completar" },
    { value: "numerica", label: "Numérica" },
  ];

  const estadoOptions = [
    { value: "todas", label: "Todas" },
    { value: "pendiente", label: "Pendientes" },
    { value: "revision", label: "En revisión" },
    { value: "aprobada", label: "Aprobadas" },
    { value: "rechazada", label: "Rechazadas" },
    { value: "archivada", label: "Archivadas" },
  ];

  async function loadMaterias() {
    const { data } = await api.get("/api/banco/materias");
    const resp = unwrapResponse(data);
    const list = safeArray(resp);
    setMaterias(list);
    // autoselect
    if (!materiaId && list.length) setMateriaId(String(list[0].id));
  }

  async function loadTemas(mId) {
    if (!mId) {
      setTemas([]);
      return;
    }
    const { data } = await api.get(`/api/banco/materia/${mId}/temas`);
    const resp = unwrapResponse(data);
    setTemas(safeArray(resp));
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
    const { data } = await api.get(`/api/banco/preguntas?${params.toString()}`);
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

  async function refreshAll() {
    setError("");
    setLoading(true);
    try {
      await loadMaterias();
    } catch (e) {
      setError("No se pudieron cargar materias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, refreshTick]);

  useEffect(() => {
    if (!materiaId) return;
    loadTemas(materiaId).catch(() => setTemas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaId]);

  useEffect(() => {
    if (!isAllowed) return;
    loadPreguntas().catch(() => setPreguntas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaId, estado, temaId, refreshTick]);

  useEffect(() => {
    if (!isAllowed) return;
    loadPendientes().catch(() => setPendientes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApprove, refreshTick]);

  const preguntasRows = useMemo(() => safeArray(preguntas), [preguntas]);

  const preguntasColumns = useMemo(
    () => [
      { header: "ID", accessor: "id" },
      { header: "Tipo", accessor: "tipo" },
      { header: "Dificultad", accessor: "dificultad" },
      { header: "Scope", accessor: "scope" },
      { header: "Parcial", accessor: "parcial_id" },
      {
        header: "Estado",
        accessor: "estado",
        cell: (row) => (
          <span
            className={[
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              row.estado === "aprobada"
                ? "bg-emerald-100 text-emerald-800"
                : row.estado === "rechazada"
                ? "bg-rose-100 text-rose-800"
                : row.estado === "revision"
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-800",
            ].join(" ")}
          >
            {row.estado}
          </span>
        ),
      },
      {
        header: "Enunciado",
        accessor: "enunciado",
        cell: (row) => (
          <div className="max-w-[520px] truncate text-sm text-slate-800">
            {row.enunciado}
          </div>
        ),
      },
    ],
    []
  );

  const pendientesColumns = useMemo(
    () => [
      { header: "Versión ID", accessor: "id" },
      { header: "Pregunta ID", accessor: "pregunta_id" },
      { header: "Materia", accessor: "materia_id" },
      { header: "Tipo", accessor: "tipo" },
      { header: "Dificultad", accessor: "dificultad" },
      { header: "Scope", accessor: "scope" },
      { header: "Parcial", accessor: "parcial_id" },
      {
        header: "",
        accessor: "actions",
        cell: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline_primary"
              onClick={() => openVoteModal(row)}
            >
              Votar
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  function resetCreateForm() {
    setCreateErr("");
    setCreateForm((prev) => ({
      ...prev,
      enunciado: "",
      dificultad: 5,
      scope: "parcial",
      parcial_id: 1,
      tema_ids: [],
      contenido_txt: prettyJSON({
        opciones: ["A", "B", "C", "D"],
        multiple: false,
      }),
      respuesta_txt: prettyJSON({
        correcta: [0],
      }),
    }));
  }

  async function submitCreate() {
    setCreateErr("");
    try {
      if (!materiaId) return setCreateErr("Selecciona una materia");
      if (!createForm.enunciado.trim()) return setCreateErr("Enunciado requerido");

      const payload = {
        materia_id: Number(materiaId),
        tipo: createForm.tipo,
        enunciado: createForm.enunciado,
        dificultad: Number(createForm.dificultad || 1),
        scope: createForm.scope,
        parcial_id: createForm.scope === "parcial" ? Number(createForm.parcial_id || 1) : null,
        tema_ids: safeArray(createForm.tema_ids).map((x) => Number(x)),
        contenido_json: parseJSON(createForm.contenido_txt, {}),
        respuesta_json: parseJSON(createForm.respuesta_txt, {}),
      };

      await api.post("/api/banco/preguntas", payload);
      setOpenCreate(false);
      resetCreateForm();
      setRefreshTick((x) => x + 1);
    } catch (e) {
      const msg =
        e?.response?.data?.response ||
        e?.response?.data?.message ||
        "No se pudo crear la pregunta";
      setCreateErr(String(msg));
    }
  }

  async function openVoteModal(row) {
    setVoteErr("");
    setVoteTarget({
      pv_id: Number(row.id),
      pregunta_id: Number(row.pregunta_id),
      materia_id: Number(row.materia_id),
    });
    setVoteForm({
      decision: "aprobar",
      area_id: "",
      comentario: "",
    });
    setVoteAreas([]);
    setOpenVote(true);

    // si es TC (rol 3), necesita escoger área
    if (roleId === 3) {
      setVoteLoading(true);
      try {
        const { data } = await api.get(`/api/banco/pregunta/${row.pregunta_id}`);
        const resp = unwrapResponse(data);
        const areas = safeArray(resp?.areas).map((a) => Number(a.area_id));
        setVoteAreas(areas);
        if (areas.length) setVoteForm((p) => ({ ...p, area_id: String(areas[0]) }));
      } catch (e) {
        setVoteErr("No pude cargar áreas de la pregunta");
      } finally {
        setVoteLoading(false);
      }
    }
  }

  async function submitVote() {
    if (!voteTarget?.pv_id) return;

    if ((voteForm.decision === "rechazar" || voteForm.decision === "revision") && !voteForm.comentario.trim()) {
      return setVoteErr("Comentario obligatorio para rechazo / revisión");
    }
    if (roleId === 3 && !voteForm.area_id) {
      return setVoteErr("Selecciona el área (Docente TC)");
    }

    setVoteErr("");
    setVoteLoading(true);
    try {
      const payload = {
        decision: voteForm.decision,
        comentario: voteForm.comentario || null,
        area_id: roleId === 3 ? Number(voteForm.area_id) : undefined,
      };
      await api.post(`/api/banco/version/${voteTarget.pv_id}/voto`, payload);
      setOpenVote(false);
      setVoteTarget(null);
      setRefreshTick((x) => x + 1);
    } catch (e) {
      const msg =
        e?.response?.data?.response ||
        e?.response?.data?.message ||
        "No se pudo votar";
      setVoteErr(String(msg));
    } finally {
      setVoteLoading(false);
    }
  }

  if (!isAllowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          No tienes acceso a este módulo.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* header */}
      <div className="mb-5 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/15">
            <BookOpen className="h-5 w-5 text-brand-red" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Banco de preguntas
            </h1>
            <p className="text-sm text-slate-600">
              Materias estandarizadas • Crear, filtrar y aprobar preguntas.
            </p>
          </div>
        </div>
      </div>

      {/* filtros */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              label="Materia"
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
            >
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo} — {m.nombre}
                </option>
              ))}
            </Select>

            <Select
              label="Tema (opcional)"
              value={temaId}
              onChange={(e) => setTemaId(e.target.value)}
            >
              <option value="">Todos</option>
              {temas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.parcial_id ? `P${t.parcial_id} · ` : ""}
                  {t.nombre}
                </option>
              ))}
            </Select>

            <Select
              label="Estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              {estadoOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline_primary"
              onClick={() => setRefreshTick((x) => x + 1)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                resetCreateForm();
                setOpenCreate(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva pregunta
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}
      </div>

      {/* contenido */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* listado preguntas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Preguntas</div>
              <div className="text-xs text-slate-500">
                Filtradas por materia/tema/estado
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Table
                columns={preguntasColumns}
                rows={preguntasRows}
                actions={{ show: false }}
              />
            </div>
          )}
        </div>

        {/* pendientes aprobación */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Pendientes por aprobar
              </div>
              <div className="text-xs text-slate-500">
                Solo Admin / Coordinador / Docente TC
              </div>
            </div>
          </div>

          {!canApprove ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Tu rol no aprueba preguntas.
            </div>
          ) : loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Table
                columns={pendientesColumns}
                rows={safeArray(pendientes)}
                actions={{ show: false }}
              />
            </div>
          )}
        </div>
      </div>

      {/* modal crear pregunta */}
      <Modal
        open={openCreate}
        title="Nueva pregunta"
        onClose={() => setOpenCreate(false)}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitCreate}>
              Crear
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {createErr && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {createErr}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Tipo"
              value={createForm.tipo}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, tipo: e.target.value }))
              }
            >
              {tipoOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            <Input
              label="Dificultad (1-10)"
              type="number"
              min="1"
              max="10"
              value={createForm.dificultad}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, dificultad: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Scope"
              value={createForm.scope}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, scope: e.target.value }))
              }
            >
              <option value="parcial">Parcial</option>
              <option value="final">Final</option>
            </Select>

            <Input
              label="Parcial ID (si aplica)"
              type="number"
              min="1"
              max="4"
              disabled={createForm.scope !== "parcial"}
              value={createForm.parcial_id}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, parcial_id: e.target.value }))
              }
            />
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Enunciado</span>
            <textarea
              value={createForm.enunciado}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, enunciado: e.target.value }))
              }
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              placeholder="Escribe el enunciado aquí..."
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Temas (opcional)
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {temas.length ? (
                temas.map((t) => {
                  const checked = safeArray(createForm.tema_ids).some(
                    (x) => String(x) === String(t.id)
                  );
                  return (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setCreateForm((p) => {
                            const cur = safeArray(p.tema_ids).map(String);
                            const id = String(t.id);
                            const next = on
                              ? Array.from(new Set([...cur, id]))
                              : cur.filter((v) => v !== id);
                            return { ...p, tema_ids: next };
                          });
                        }}
                      />
                      <span className="text-slate-800">
                        {t.parcial_id ? `P${t.parcial_id} · ` : ""}
                        {t.nombre}
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="text-sm text-slate-600">
                  No hay temas para esta materia.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">
                Contenido JSON
              </span>
              <textarea
                value={createForm.contenido_txt}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, contenido_txt: e.target.value }))
                }
                rows={8}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">
                Respuesta JSON
              </span>
              <textarea
                value={createForm.respuesta_txt}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, respuesta_txt: e.target.value }))
                }
                rows={8}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            Tip rápido: si solo quieres “mostrar”, mete el contenido/respuesta en
            JSON simple. Ya luego refinamos por tipo.
          </div>
        </div>
      </Modal>

      {/* modal votar */}
      <Modal
        open={openVote}
        title="Votar aprobación"
        onClose={() => setOpenVote(false)}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenVote(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitVote} disabled={voteLoading}>
              {voteLoading ? "Guardando..." : "Enviar voto"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {voteErr && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {voteErr}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Versión:</span>
              <span className="font-semibold">{voteTarget?.pv_id ?? "—"}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>Pregunta:</span>
              <span className="font-semibold">{voteTarget?.pregunta_id ?? "—"}</span>
            </div>
          </div>

          <Select
            label="Decisión"
            value={voteForm.decision}
            onChange={(e) =>
              setVoteForm((p) => ({ ...p, decision: e.target.value }))
            }
          >
            <option value="aprobar">Aprobar</option>
            <option value="revision">Revisión</option>
            <option value="rechazar">Rechazar</option>
          </Select>

          {roleId === 3 && (
            <Select
              label="Área (Docente TC)"
              value={voteForm.area_id}
              onChange={(e) =>
                setVoteForm((p) => ({ ...p, area_id: e.target.value }))
              }
              disabled={voteLoading}
            >
              {voteAreas.map((a) => (
                <option key={a} value={a}>
                  Área #{a}
                </option>
              ))}
            </Select>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">
              Comentario {voteForm.decision !== "aprobar" ? "(obligatorio)" : "(opcional)"}
            </span>
            <textarea
              value={voteForm.comentario}
              onChange={(e) =>
                setVoteForm((p) => ({ ...p, comentario: e.target.value }))
              }
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              placeholder="Escribe tu comentario..."
            />
          </label>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Aprobar: si cumple • Revisión/Rechazar: comentario obligatorio.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
