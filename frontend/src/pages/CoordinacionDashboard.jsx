// src/pages/CoordinacionDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import {
  GraduationCap,
  Building2,
  CalendarDays,
  BookOpen,
  Layers,
  Users,
  User2,
  AlertCircle,
  Inbox,
  Search,
} from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-red/30 bg-brand-red/10 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-red/20">
        <Icon className="h-5 w-5 text-brand-red" />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
          {label}
        </div>
        <div className="mt-1 text-xl font-semibold text-slate-900">
          {value ?? 0}
        </div>
      </div>
    </div>
  );
}

export default function CoordinacionDashboard({ currentUser }) {
  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isAllowed = roleId === 1 || roleId === 2;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const [periodCode, setPeriodCode] = useState("");
  const [activeCareerId, setActiveCareerId] = useState(null);

  const [search, setSearch] = useState("");

  const [openSectionModal, setOpenSectionModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  async function loadDashboard(code) {
    setLoading(true);
    setError("");

    try {
      const url = code
        ? `/api/coordinacion/dashboard/${encodeURIComponent(code)}`
        : "/api/coordinacion/dashboard";

      const { data } = await api.get(url);
      const resp = unwrapResponse(data);

      setPayload(resp || null);

      const carreras = safeArray(resp?.carreras);
      if (carreras.length) {
        setActiveCareerId((prev) =>
          carreras.some((c) => Number(c.id) === Number(prev))
            ? prev
            : Number(carreras[0].id)
        );
      } else {
        setActiveCareerId(null);
      }
    } catch (e) {
      console.error(e);
      setPayload(null);
      setError(
        e?.response?.data?.response ||
          "No fue posible cargar el dashboard de coordinación."
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
    loadDashboard('2025-C1');
  }, [isAllowed]);

  const area = payload?.area ?? null;
  const periodo = payload?.periodo ?? null;
  const carreras = safeArray(payload?.carreras);

  const stats = payload?.stats ?? {
    carreras: carreras.length,
    materias: 0,
    secciones: 0,
    alumnos: 0,
  };

  const activeCareer = useMemo(() => {
    if (!activeCareerId) return null;
    return carreras.find((c) => Number(c.id) === Number(activeCareerId)) || null;
  }, [carreras, activeCareerId]);

  const filteredMaterias = useMemo(() => {
    const mats = safeArray(activeCareer?.materias);
    const term = search.trim().toLowerCase();
    if (!term) return mats;

    return mats.filter((m) => {
      const n = String(m?.nombre_materia ?? "").toLowerCase();
      const c = String(m?.codigo_materia ?? "").toLowerCase();
      return n.includes(term) || c.includes(term);
    });
  }, [activeCareer, search]);

  const semesterGroups = useMemo(() => {
    const mats = filteredMaterias;
    const map = new Map();

    mats.forEach((m) => {
      const sem =
        m?.num_semestre !== null && m?.num_semestre !== undefined
          ? String(m.num_semestre)
          : "Sin semestre";
      if (!map.has(sem)) map.set(sem, []);
      map.get(sem).push(m);
    });

    const numeric = [];
    const other = [];

    for (const [k, list] of map.entries()) {
      if (/^\d+$/.test(k)) {
        numeric.push({ key: k, label: `Semestre ${k}`, materias: list });
      } else {
        other.push({ key: k, label: k, materias: list });
      }
    }

    numeric.sort((a, b) => Number(a.key) - Number(b.key));
    return [...numeric, ...other];
  }, [filteredMaterias]);

  function openGroup(materia, seccion) {
    setSelectedSection({
      materia,
      seccion,
      alumnos: safeArray(seccion?.alumnos),
      docente: seccion?.docente ?? null,
      career: activeCareer,
      periodo,
      area,
    });
    setOpenSectionModal(true);
  }

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Acceso restringido
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Esta página solo está disponible para Administradores y
            Coordinadores.
          </p>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-2 py-4">
        <Skeleton rows={10} />
      </div>
    );
  }

  const hasData = carreras.length > 0;

  return (
    <div className="px-1 py-2">
      {/* Header */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-red/10">
              <GraduationCap className="h-5 w-5 text-brand-red" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
                Coordinación • Dashboard
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-brand-red" />
                  <span className="font-medium text-slate-800">
                    {area?.nombre ?? "—"}
                  </span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-brand-red" />
                  <span className="font-medium text-slate-800">
                    {periodo?.codigo ?? periodo?.nombre ?? "Periodo actual"}
                  </span>
                </span>
                {periodo?.fecha_inicio && periodo?.fecha_fin && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs">
                      {periodo.fecha_inicio} → {periodo.fecha_fin}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Selector simple por código de periodo */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-600">
                Código de periodo
              </span>
              <Input
                value={periodCode}
                onChange={(e) => setPeriodCode(e.target.value)}
                placeholder="Ej. 2025-C1"
                className="w-32"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setPeriodCode("");
                  loadDashboard();
                }}
              >
                Actual
              </Button>
              <Button
                onClick={() => {
                  const code = periodCode.trim();
                  if (!code) return;
                  loadDashboard(code);
                }}
              >
                Cargar
              </Button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>{error}</div>
          </div>
        )}

        {/* Stats */}
        {hasData && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StatCard label="Carreras" value={stats.carreras} icon={Building2} />
            <StatCard label="Materias" value={stats.materias} icon={BookOpen} />
            <StatCard label="Secciones" value={stats.secciones} icon={Layers} />
            <StatCard label="Alumnos" value={stats.alumnos} icon={Users} />
          </div>
        )}
      </section>

      {/* Estado vacío */}
      {!hasData && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-red/10">
            <Inbox className="h-8 w-8 text-slate-400" />
          </div>
          <h5 className="mb-2 text-base font-semibold text-slate-900">
            Sin datos para mostrar
          </h5>
          <p className="mx-auto max-w-md text-sm text-slate-500">
            Tu área aún no tiene carreras o secciones activas para este periodo.
          </p>
        </div>
      )}

      {/* Carreras */}
      {hasData && (
        <section className="space-y-4">
          {/* Tabs de carrera */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap gap-2">
              {carreras.map((c) => {
                const isActive = Number(c.id) === Number(activeCareerId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCareerId(Number(c.id))}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition",
                      isActive
                        ? "border-brand-red bg-brand-red text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand-red/60 hover:text-brand-red",
                    ].join(" ")}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="font-medium truncate max-w-[180px]">
                      {c.nombre_carrera ?? "Carrera"}
                    </span>
                    {c.codigo_carrera && (
                      <span
                        className={
                          isActive
                            ? "text-white/80 text-[11px]"
                            : "text-slate-400 text-[11px]"
                        }
                      >
                        ({c.codigo_carrera})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido carrera activa */}
          {activeCareer && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {activeCareer.nombre_carrera}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeCareer.codigo_carrera ?? ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar materia por nombre o código…"
                    className="w-64 max-w-full"
                  />
                </div>
              </div>

              {semesterGroups.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  No hay materias para mostrar con los filtros actuales.
                </div>
              )}

              <div className="space-y-4">
                {semesterGroups.map((group) => (
                  <div
                    key={group.key}
                    className="rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-brand-red/10 px-2.5 py-0.5 text-xs font-semibold text-brand-red">
                          {group.label}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {group.materias.length} materia
                          {group.materias.length !== 1 && "s"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      {group.materias.map((m) => {
                        const secciones = safeArray(m?.secciones);

                        const alumnosUnicos = new Set();
                        secciones.forEach((s) =>
                          safeArray(s?.alumnos).forEach((a) => {
                            if (a?.id != null) alumnosUnicos.add(Number(a.id));
                          })
                        );

                        return (
                          <div
                            key={m.id ?? `${m.codigo_materia}-${m.nombre_materia}`}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {m.nombre_materia ?? "Materia"}
                                  </span>
                                  {m.codigo_materia && (
                                    <span className="inline-flex rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-white">
                                      {m.codigo_materia}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                    <Layers className="h-3 w-3" />
                                    {secciones.length} sección
                                    {secciones.length !== 1 && "es"}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                    <Users className="h-3 w-3" />
                                    {alumnosUnicos.size} alumno
                                    {alumnosUnicos.size !== 1 && "s"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Tabla de secciones */}
                            {secciones.length === 0 ? (
                              <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                                Sin secciones activas registradas.
                              </div>
                            ) : (
                              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full text-left text-xs">
                                  <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                                    <tr>
                                      <th className="px-3 py-2">Grupo</th>
                                      <th className="px-3 py-2">Modalidad</th>
                                      <th className="px-3 py-2">Docente</th>
                                      <th className="px-3 py-2 text-right">
                                        Alumnos
                                      </th>
                                      <th className="px-3 py-2 text-right">
                                        Acción
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {secciones.map((s) => {
                                      const alumnos = safeArray(s?.alumnos);
                                      const docenteNombre =
                                        s?.docente?.nombre_completo ??
                                        "Sin docente";

                                      return (
                                        <tr
                                          key={s.id ?? `${m.id}-sec`}
                                          className="border-t border-slate-100 hover:bg-slate-50"
                                        >
                                          <td className="px-3 py-2">
                                            {s.grupo ?? "—"}
                                          </td>
                                          <td className="px-3 py-2">
                                            {s.modalidad ?? "—"}
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="inline-flex items-center gap-1">
                                              <User2 className="h-3 w-3 text-slate-400" />
                                              <span className="truncate max-w-[220px]">
                                                {docenteNombre}
                                              </span>
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            {alumnos.length}
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              onClick={() => openGroup(m, s)}
                                            >
                                              Ver grupo
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Modal Ver Grupo */}
      <Modal
        open={openSectionModal}
        onClose={() => {
          setOpenSectionModal(false);
          setSelectedSection(null);
        }}
        title="Detalle de grupo"
        size="md"
      >
        {!selectedSection ? (
          <div className="text-sm text-slate-600">Sin información.</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">
                {selectedSection?.career?.nombre_carrera ?? "Carrera"}{" "}
                {selectedSection?.career?.codigo_carrera
                  ? `(${selectedSection.career.codigo_carrera})`
                  : ""}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {selectedSection?.materia?.nombre_materia ?? "Materia"}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-600">
                {selectedSection?.materia?.codigo_materia && (
                  <span className="inline-flex rounded-md bg-slate-900 px-2 py-0.5 font-mono text-white">
                    {selectedSection.materia.codigo_materia}
                  </span>
                )}
                <span className="inline-flex rounded-full bg-white px-2 py-0.5">
                  Grupo: {selectedSection?.seccion?.grupo ?? "—"}
                </span>
                <span className="inline-flex rounded-full bg-white px-2 py-0.5">
                  Modalidad: {selectedSection?.seccion?.modalidad ?? "—"}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Docente
              </div>
              <div className="text-sm text-slate-900">
                {selectedSection?.docente?.nombre_completo ??
                  "Sin docente asignado"}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Alumnos inscritos
                </span>
                <span className="text-xs text-slate-500">
                  {safeArray(selectedSection.alumnos).length} total
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2">
                {safeArray(selectedSection.alumnos).length === 0 ? (
                  <p className="text-xs italic text-slate-400">
                    No hay alumnos inscritos en esta sección.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {safeArray(selectedSection.alumnos).map((a) => (
                      <li
                        key={a.id ?? `${a.correo}-${a.matricula}`}
                        className="flex items-center justify-between gap-2 border-b border-slate-50 py-1 last:border-0"
                      >
                        <span className="truncate">
                          {a.nombre_completo ?? "Alumno"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {a.matricula ?? a.correo ?? ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
