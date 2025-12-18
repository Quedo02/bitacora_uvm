// src/pages/CoordinacionDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { MateriaCard } from "../components/ui/Card";
import { ModalImportarSemestre } from "../components/coordinacion/ModalImport";
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
  FileSpreadsheet,
} from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function getPeriodoCodigo(p) {
  const code = p?.codigo ?? p?.codigo_periodo ?? p?.code ?? p?.nombre ?? "";
  return String(code || "").trim();
}

function periodoKeyFromCodigo(code) {
  const s = String(code || "").trim();
  const m = s.match(/^(\d{4})-([A-Za-z]+)(\d+)$/);
  if (!m) return 0;
  const year = Number(m[1]);
  const letter = String(m[2] || "").toUpperCase();
  const num = Number(m[3]);
  const letterKey = letter === "C" ? 1 : letter.charCodeAt(0);
  return year * 10000 + letterKey * 100 + num;
}

function comparePeriodoAsc(a, b) {
  const ai = a?.fecha_inicio ?? a?.fechaInicio ?? null;
  const bi = b?.fecha_inicio ?? b?.fechaInicio ?? null;

  if (ai && bi) return String(ai).localeCompare(String(bi));

  const ak = periodoKeyFromCodigo(getPeriodoCodigo(a));
  const bk = periodoKeyFromCodigo(getPeriodoCodigo(b));
  if (ak !== bk) return ak - bk;

  return getPeriodoCodigo(a).localeCompare(getPeriodoCodigo(b));
}

function windowAroundPeriodo(sorted, centerCode, radius = 5) {
  const list = Array.isArray(sorted) ? sorted : [];
  if (list.length <= radius * 2 + 1) return list;

  const idx = list.findIndex((p) => getPeriodoCodigo(p) === centerCode);
  if (idx === -1) return list.slice(0, radius * 2 + 1);

  let start = Math.max(0, idx - radius);
  let end = Math.min(list.length, idx + radius + 1);

  const desired = radius * 2 + 1;
  const currentLen = end - start;

  if (currentLen < desired) {
    const missing = desired - currentLen;
    start = Math.max(0, start - missing);
    end = Math.min(list.length, start + desired);
    start = Math.max(0, end - desired);
  }

  return list.slice(start, end);
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-red/20 bg-gradient-to-br from-brand-red/5 to-brand-red/10 px-4 py-3 transition-all hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-red/20 shadow-sm">
        <Icon className="h-5 w-5 text-brand-red" />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold text-slate-900">
          {value ?? 0}
        </div>
      </div>
    </div>
  );
}

export default function CoordinacionDashboard({ currentUser }) {
  const navigate = useNavigate();
  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isAllowed = roleId === 1 || roleId === 2;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const [periodCode, setPeriodCode] = useState("");
  const [allPeriodos, setAllPeriodos] = useState([]);

  const [activeCareerId, setActiveCareerId] = useState(null);
  const [activeSemester, setActiveSemester] = useState("1");

  const [search, setSearch] = useState("");
  const [openImportModal, setOpenImportModal] = useState(false);

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

      const loadedCode = code ? String(code).trim() : getPeriodoCodigo(resp?.periodo);
      if (loadedCode) setPeriodCode(loadedCode);

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

  async function loadAllPeriodos() {
    try {
      const { data } = await api.get("/api/periodo");
      const resp = unwrapResponse(data);
      const list = safeArray(resp);
      setAllPeriodos(list);
    } catch (e) {
      console.error(e);
      setAllPeriodos([]);
    }
  }

  useEffect(() => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    loadDashboard();
    loadAllPeriodos();
  }, [isAllowed]);

  const area = payload?.area ?? null;
  const periodo = payload?.periodo ?? null;
  const carreras = safeArray(payload?.carreras);

  const periodOptions = useMemo(() => {
    const base = safeArray(allPeriodos);

    if (base.length === 0) {
      const code = periodCode || getPeriodoCodigo(periodo);
      return code ? [{ ...(periodo || {}), codigo: code }] : [];
    }

    const sorted = [...base].sort(comparePeriodoAsc);
    const center =
      periodCode || getPeriodoCodigo(periodo) || getPeriodoCodigo(sorted[sorted.length - 1]);

    return windowAroundPeriodo(sorted, center, 5);
  }, [allPeriodos, periodCode, periodo]);

  const selectedPeriodoCode = periodCode || getPeriodoCodigo(periodo) || "";

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

  // Encontrar materias del semestre activo
  const activeSemesterData = useMemo(() => {
    return semesterGroups.find((g) => g.key === activeSemester) || null;
  }, [semesterGroups, activeSemester]);

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
    <div className="px-1 py-2 space-y-5">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red/10 to-brand-red/20 shadow-sm">
              <GraduationCap className="h-6 w-6 text-brand-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Coordinación • Dashboard
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
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
                    <span className="text-xs text-slate-500">
                      {periodo.fecha_inicio} → {periodo.fecha_fin}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Selector de periodo */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-600">Periodo</span>

              <select
                className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium"
                value={
                  periodOptions.some(
                    (p) => getPeriodoCodigo(p) === selectedPeriodoCode
                  )
                    ? selectedPeriodoCode
                    : ""
                }
                onChange={(e) => {
                  const code = e.target.value;
                  setPeriodCode(code);
                  loadDashboard(code);
                }}
                disabled={periodOptions.length === 0}
              >
                {periodOptions.length === 0 ? (
                  <option value="">Sin periodos</option>
                ) : (
                  periodOptions.map((p) => {
                    const code = getPeriodoCodigo(p);
                    return (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <Button
              variant="secondary"
              onClick={() => setOpenImportModal(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar Excel
            </Button>
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
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Carreras" value={stats.carreras} icon={Building2} />
            <StatCard label="Materias" value={stats.materias} icon={BookOpen} />
            <StatCard label="Secciones" value={stats.secciones} icon={Layers} />
            <StatCard label="Alumnos" value={stats.alumnos} icon={Users} />
          </div>
        )}
      </section>

      {/* Estado vacío */}
      {!hasData && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <Inbox className="h-10 w-10 text-slate-400" />
          </div>
          <h5 className="mb-2 text-lg font-semibold text-slate-900">
            Sin datos para mostrar
          </h5>
          <p className="mx-auto max-w-md text-sm text-slate-500">
            Tu área aún no tiene carreras o secciones activas para este periodo.
          </p>
        </div>
      )}

      {/* Carreras */}
      {hasData && (
        <>
          {/* Tabs de carrera */}
          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-brand-red" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Carreras disponibles
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {carreras.map((c) => {
                const isActive = Number(c.id) === Number(activeCareerId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveCareerId(Number(c.id));
                      setActiveSemester("1");
                    }}
                    className={[
                      "group relative overflow-hidden rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "border-brand-red bg-brand-red text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand-red/40 hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <span className="truncate max-w-[200px]">
                        {c.nombre_carrera ?? "Carrera"}
                      </span>
                      {c.codigo_carrera && (
                        <span
                          className={
                            isActive
                              ? "text-white/70 text-xs"
                              : "text-slate-400 text-xs"
                          }
                        >
                          ({c.codigo_carrera})
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-wine/20 to-transparent opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Contenido carrera activa */}
          {activeCareer && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Header con búsqueda */}
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {activeCareer.nombre_carrera}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {activeCareer.codigo_carrera ?? ""}
                    </p>
                  </div>

                  {/* Búsqueda */}
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar materia..."
                      className="w-48 border-none p-0 focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              {/* Pestañas de semestres */}
              {semesterGroups.length > 0 && (
                <div className="border-b border-slate-200 bg-slate-50 px-5">
                  <div className="flex gap-1 overflow-x-auto">
                    {semesterGroups.map((group) => {
                      const isActive = group.key === activeSemester;
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setActiveSemester(group.key)}
                          className={[
                            "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                            isActive
                              ? "text-brand-red"
                              : "text-slate-600 hover:text-slate-900",
                          ].join(" ")}
                        >
                          <span>{group.label}</span>
                          <span className="ml-2 text-xs opacity-70">
                            ({group.materias.length})
                          </span>
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contenido del semestre activo */}
              <div className="p-5">
                {!activeSemesterData || activeSemesterData.materias.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                    No hay materias para mostrar en este semestre.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeSemesterData.materias.map((m) => {
                      const secciones = safeArray(m?.secciones);

                      // Preparar grupos para la card
                      const grupos = secciones.map((s) => {
                        const alumnos = safeArray(s?.alumnos);
                        const docenteNombre =
                          s?.docente?.nombre_completo ?? "Sin docente";

                        return {
                          id: s.id,
                          content: (
                            <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center rounded-full bg-brand-red/10 px-2.5 py-1 text-xs font-bold text-brand-red min-w-[60px]">
                                  {s.grupo ?? "—"}
                                </span>
                                <span className="text-xs text-slate-600 capitalize">
                                  {s.modalidad ?? "—"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <User2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                <span className="text-xs text-slate-700 truncate">
                                  {docenteNombre}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                  <Users className="h-3 w-3 text-slate-500" />
                                  <span className="text-xs font-medium text-slate-600">
                                    {alumnos.length}
                                  </span>
                                </div>
                                <span className="text-xs font-medium text-brand-red opacity-0 group-hover:opacity-100 transition-opacity">
                                  Ver →
                                </span>
                              </div>
                            </div>
                          ),
                        };
                      });

                      return (
                        <MateriaCard
                          key={m.id ?? `${m.codigo_materia}-${m.nombre_materia}`}
                          materia={m}
                          grupos={grupos}
                          onGroupClick={(grupo) => navigate(`/docente/clases/${grupo.id}`)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      <ModalImportarSemestre
        open={openImportModal}
        onClose={() => setOpenImportModal(false)}
        defaultPeriodo={periodCode}
        onSuccess={() => {
          loadAllPeriodos();
          const code = periodCode.trim();
          loadDashboard(code || "");
        }}
      />
    </div>
  );
}