// src/pages/ExamenesDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Table from "../components/ui/Table";
import { ClipboardList, Plus, RefreshCw, Wand2 } from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function toMysqlDatetime(dtLocal) {
  // "2025-12-15T13:05" -> "2025-12-15 13:05:00"
  if (!dtLocal) return "";
  return String(dtLocal).replace("T", " ") + ":00";
}

export default function ExamenesDashboard({ currentUser }) {
  const params = useParams();
  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isAllowed = roleId !== 0;

  const isDocente = roleId === 3 || roleId === 4;
  const isAdmin = roleId === 1;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [clases, setClases] = useState([]); // /api/docente/clases
  const [seccionId, setSeccionId] = useState(params?.seccionId ? String(params.seccionId) : "");

  const [examenes, setExamenes] = useState([]);
  const [selectedExamen, setSelectedExamen] = useState(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createForm, setCreateForm] = useState({
    tipo: "parcial",
    parcial_id: 1,
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

  async function loadClasesIfNeeded() {
    if (!isDocente) return;
    const { data } = await api.get("/api/docente/clases");
    const resp = unwrapResponse(data);
    const list = safeArray(resp?.clases);
    setClases(list);

    if (!seccionId && list.length) {
      setSeccionId(String(list[0].seccion_id ?? list[0].id));
    }
  }

  async function loadExamenes(sId) {
    if (!sId) {
      setExamenes([]);
      return;
    }
    const { data } = await api.get(`/api/examenes/seccion/${sId}`);
    const resp = unwrapResponse(data);
    setExamenes(safeArray(resp));
  }

  async function refreshAll() {
    setError("");
    setLoading(true);
    try {
      await loadClasesIfNeeded();
    } catch (e) {
      // si no eres docente, no pasa nada
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed]);

  useEffect(() => {
    if (!seccionId) return;
    loadExamenes(seccionId).catch(() => setExamenes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionId]);

  const examenesColumns = useMemo(
    () => [
      { header: "ID", accessor: "id" },
      { header: "Tipo", accessor: "tipo" },
      { header: "Parcial", accessor: "parcial_id" },
      { header: "Inicio", accessor: "fecha_inicio" },
      { header: "Duración", accessor: "duracion_min" },
      { header: "Intentos", accessor: "intentos_max" },
      {
        header: "Estado",
        accessor: "estado",
        cell: (row) => (
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
            {row.estado}
          </span>
        ),
      },
      {
        header: "",
        accessor: "actions",
        cell: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline_primary"
              onClick={() => openDetalleModal(row)}
            >
              Detalle
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  async function openDetalleModal(row) {
    setSelectedExamen(row);
    setOpenDetalle(true);
    setDetalle(null);
    setDetalleLoading(true);
    try {
      const { data } = await api.get(`/api/examenes/examen/${row.id}`);
      setDetalle(unwrapResponse(data));
    } catch (e) {
      setError("No pude cargar detalle del examen");
    } finally {
      setDetalleLoading(false);
    }
  }

  async function doArmar() {
    if (!selectedExamen?.id) return;
    setDetalleLoading(true);
    try {
      await api.post(`/api/examenes/examen/${selectedExamen.id}/armar`, {});
      await openDetalleModal(selectedExamen);
      await loadExamenes(seccionId);
    } catch (e) {
      setError(String(e?.response?.data?.response || "No se pudo armar"));
    } finally {
      setDetalleLoading(false);
    }
  }

  async function doPublicar() {
    if (!selectedExamen?.id) return;
    setDetalleLoading(true);
    try {
      await api.post(`/api/examenes/examen/${selectedExamen.id}/publicar`, {});
      await openDetalleModal(selectedExamen);
      await loadExamenes(seccionId);
    } catch (e) {
      setError(String(e?.response?.data?.response || "No se pudo publicar"));
    } finally {
      setDetalleLoading(false);
    }
  }

  async function doCerrar() {
    if (!selectedExamen?.id) return;
    setDetalleLoading(true);
    try {
      await api.post(`/api/examenes/examen/${selectedExamen.id}/cerrar`, {});
      await openDetalleModal(selectedExamen);
      await loadExamenes(seccionId);
    } catch (e) {
      setError(String(e?.response?.data?.response || "No se pudo cerrar"));
    } finally {
      setDetalleLoading(false);
    }
  }

  function resetCreate() {
    setCreateErr("");
    setCreateForm((p) => ({
      ...p,
      tipo: "parcial",
      parcial_id: 1,
      fecha_inicio: "",
      duracion_min: 60,
      intentos_max: 1,
      modo_armado: "random",
      num_preguntas: 10,
      dificultad_min: 1,
      dificultad_max: 10,
      mezclar_preguntas: 1,
      mezclar_opciones: 1,
    }));
  }

  async function submitCreate() {
    setCreateErr("");
    try {
      if (!seccionId) return setCreateErr("Necesitas seccion_id");
      if (!createForm.fecha_inicio) return setCreateErr("fecha_inicio requerida");

      const payload = {
        tipo: createForm.tipo,
        parcial_id: createForm.tipo === "parcial" ? Number(createForm.parcial_id || 1) : null,
        fecha_inicio: toMysqlDatetime(createForm.fecha_inicio),
        duracion_min: Number(createForm.duracion_min || 60),
        intentos_max: Number(createForm.intentos_max || 1),
        modo_armado: createForm.modo_armado,
        num_preguntas: Number(createForm.num_preguntas || 10),
        dificultad_min: Number(createForm.dificultad_min || 1),
        dificultad_max: Number(createForm.dificultad_max || 10),
        mezclar_preguntas: Number(createForm.mezclar_preguntas || 1),
        mezclar_opciones: Number(createForm.mezclar_opciones || 1),
      };

      await api.post(`/api/examenes/seccion/${seccionId}`, payload);
      setOpenCreate(false);
      resetCreate();
      await loadExamenes(seccionId);
    } catch (e) {
      const msg =
        e?.response?.data?.response ||
        e?.response?.data?.message ||
        "No se pudo crear examen";
      setCreateErr(String(msg));
    }
  }

  if (!isAllowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          No tienes acceso.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* header */}
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/15">
          <ClipboardList className="h-5 w-5 text-brand-red" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Exámenes</h1>
          <p className="text-sm text-slate-600">
            Crear, armar y administrar exámenes por sección.
          </p>
        </div>
      </div>

      {/* selector seccion */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {isDocente ? (
            <Select
              label="Mi sección"
              value={seccionId}
              onChange={(e) => setSeccionId(e.target.value)}
            >
              {clases.map((c) => (
                <option key={c.seccion_id} value={c.seccion_id}>
                  {c.periodo} · {c.materia?.codigo} · {c.materia?.nombre} · Grupo {c.grupo}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="seccion_id"
              value={seccionId}
              onChange={(e) => setSeccionId(e.target.value)}
              placeholder="Ej: 12"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline_primary" onClick={() => loadExamenes(seccionId)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>

            {(isAdmin || isDocente) && (
              <Button
                variant="primary"
                onClick={() => {
                  resetCreate();
                  setOpenCreate(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear examen
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}
      </div>

      {/* listado */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-slate-900">
          Exámenes de la sección
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <Table columns={examenesColumns} rows={safeArray(examenes)} actions={{ show: false }} />
          </div>
        )}
      </div>

      {/* modal crear */}
      <Modal
        open={openCreate}
        title="Crear examen"
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
              onChange={(e) => setCreateForm((p) => ({ ...p, tipo: e.target.value }))}
            >
              <option value="parcial">Parcial</option>
              <option value="final">Final</option>
            </Select>

            <Input
              label="Parcial ID (si aplica)"
              type="number"
              min="1"
              max="4"
              disabled={createForm.tipo !== "parcial"}
              value={createForm.parcial_id}
              onChange={(e) => setCreateForm((p) => ({ ...p, parcial_id: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Fecha inicio</span>
              <input
                type="datetime-local"
                value={createForm.fecha_inicio}
                onChange={(e) => setCreateForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </label>

            <Input
              label="Duración (min)"
              type="number"
              min="5"
              value={createForm.duracion_min}
              onChange={(e) => setCreateForm((p) => ({ ...p, duracion_min: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              label="Intentos max"
              type="number"
              min="1"
              value={createForm.intentos_max}
              onChange={(e) => setCreateForm((p) => ({ ...p, intentos_max: e.target.value }))}
            />
            <Input
              label="# Preguntas"
              type="number"
              min="1"
              value={createForm.num_preguntas}
              onChange={(e) => setCreateForm((p) => ({ ...p, num_preguntas: e.target.value }))}
            />
            <Select
              label="Modo"
              value={createForm.modo_armado}
              onChange={(e) => setCreateForm((p) => ({ ...p, modo_armado: e.target.value }))}
            >
              <option value="random">Random</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Dificultad min"
              type="number"
              min="1"
              max="10"
              value={createForm.dificultad_min}
              onChange={(e) => setCreateForm((p) => ({ ...p, dificultad_min: e.target.value }))}
            />
            <Input
              label="Dificultad max"
              type="number"
              min="1"
              max="10"
              value={createForm.dificultad_max}
              onChange={(e) => setCreateForm((p) => ({ ...p, dificultad_max: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Mezclar preguntas"
              value={createForm.mezclar_preguntas}
              onChange={(e) => setCreateForm((p) => ({ ...p, mezclar_preguntas: e.target.value }))}
            >
              <option value={1}>Sí</option>
              <option value={0}>No</option>
            </Select>

            <Select
              label="Mezclar opciones"
              value={createForm.mezclar_opciones}
              onChange={(e) => setCreateForm((p) => ({ ...p, mezclar_opciones: e.target.value }))}
            >
              <option value={1}>Sí</option>
              <option value={0}>No</option>
            </Select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Nota: este formulario es “para mostrar”. Ya luego refinamos reglas de fechas/estados.
          </div>
        </div>
      </Modal>

      {/* modal detalle */}
      <Modal
        open={openDetalle}
        title={`Examen #${selectedExamen?.id ?? ""}`}
        onClose={() => setOpenDetalle(false)}
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {(isAdmin || isDocente) && (
              <>
                <Button variant="outline_primary" onClick={doArmar} disabled={detalleLoading}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Armar
                </Button>
                <Button variant="outline_primary" onClick={doPublicar} disabled={detalleLoading}>
                  Publicar
                </Button>
                <Button variant="danger" onClick={doCerrar} disabled={detalleLoading}>
                  Cerrar
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => setOpenDetalle(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {detalleLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : !detalle ? (
          <div className="text-sm text-slate-600">Sin detalle</div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="text-slate-600">Estado</div>
              <div className="font-semibold text-slate-900">{detalle?.examen?.estado}</div>

              <div className="text-slate-600">Fecha</div>
              <div className="font-semibold text-slate-900">{detalle?.examen?.fecha_inicio}</div>

              <div className="text-slate-600">Duración</div>
              <div className="font-semibold text-slate-900">{detalle?.examen?.duracion_min} min</div>

              <div className="text-slate-600">Preguntas</div>
              <div className="font-semibold text-slate-900">{safeArray(detalle?.preguntas).length}</div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Table
                columns={[
                  { header: "Orden", accessor: "orden_base" },
                  { header: "Pregunta versión", accessor: "pregunta_version_id" },
                  { header: "Puntos", accessor: "puntos" },
                ]}
                rows={safeArray(detalle?.preguntas)}
                actions={{ show: false }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
