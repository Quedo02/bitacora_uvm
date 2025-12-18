// src/pages/CoordinacionPersonas.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  Users,
  User2,
  Building2,
  CalendarDays,
  AlertCircle,
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

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
      {children}
    </span>
  );
}

function parsePeriodoCode(code) {
  // Soporta algo tipo 2025-C1, 2025-C2, etc.
  const s = String(code || "").trim();
  const m = s.match(/^(\d{4})-C(\d{1,2})$/i);
  if (!m) return null;
  const year = Number(m[1]);
  const term = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(term)) return null;
  return year * 100 + term;
}

function getPeriodoCodigo(p) {
  return String(p?.codigo ?? p?.codigo_periodo ?? p?.code ?? "").trim();
}

export default function CoordinacionPersonas({ currentUser }) {
  const roleId = Number(currentUser?.rol_id ?? currentUser?.role_id ?? 0);
  const isAllowed = roleId === 1 || roleId === 2;

  const [activeTab, setActiveTab] = useState("alumnos");

  const [loadingAl, setLoadingAl] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [errorAl, setErrorAl] = useState("");
  const [errorDoc, setErrorDoc] = useState("");

  const [payloadAl, setPayloadAl] = useState(null);
  const [payloadDoc, setPayloadDoc] = useState(null);

  // ✅ ahora periodCode es el valor seleccionado del dropdown
  const [periodCode, setPeriodCode] = useState("");

  // ✅ lista completa desde /api/periodo
  const [allPeriodos, setAllPeriodos] = useState([]);

  const [search, setSearch] = useState("");

  async function loadAlumnos() {
    setLoadingAl(true);
    setErrorAl("");
    try {
      const { data } = await api.get("/api/coordinacion/alumnos-area");
      setPayloadAl(unwrapResponse(data) || null);
    } catch (e) {
      console.error(e);
      setPayloadAl(null);
      setErrorAl(
        e?.response?.data?.response || "No fue posible cargar alumnos del área."
      );
    } finally {
      setLoadingAl(false);
    }
  }

  async function loadDocentes(code) {
    setLoadingDoc(true);
    setErrorDoc("");
    try {
      const url = code
        ? `/api/coordinacion/docentes-area/${encodeURIComponent(code)}`
        : "/api/coordinacion/docentes-area";

      const { data } = await api.get(url);
      setPayloadDoc(unwrapResponse(data) || null);
    } catch (e) {
      console.error(e);
      setPayloadDoc(null);
      setErrorDoc(
        e?.response?.data?.response || "No fue posible cargar docentes del área."
      );
    } finally {
      setLoadingDoc(false);
    }
  }

  async function loadPeriodos() {
    try {
      // usando tu CRUD genérico: GET /api/periodo
      const { data } = await api.get("/api/periodo");
      const list = safeArray(unwrapResponse(data));
      setAllPeriodos(list);
    } catch (e) {
      console.error("Error al cargar periodos", e);
      setAllPeriodos([]);
    }
  }

  useEffect(() => {
    if (!isAllowed) {
      setLoadingAl(false);
      setLoadingDoc(false);
      return;
    }
    loadAlumnos();
    loadDocentes(); // ✅ sin hardcode (backend decide periodo actual)
    loadPeriodos(); // ✅ llena dropdown
  }, [isAllowed]);

  const areaAl = payloadAl?.area ?? null;
  const carrerasAl = safeArray(payloadAl?.carreras);

  const areaDoc = payloadDoc?.area ?? null;
  const periodoDoc = payloadDoc?.periodo ?? null;
  const docentes = safeArray(payloadDoc?.docentes);

  // ✅ setea valor inicial del dropdown en cuanto backend diga "periodo actual"
  useEffect(() => {
    const code = String(periodoDoc?.codigo ?? "").trim();
    if (code && !periodCode) setPeriodCode(code);
  }, [periodoDoc?.codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedPeriodos = useMemo(() => {
    const list = safeArray(allPeriodos).filter((p) => getPeriodoCodigo(p));

    // si existe fecha_inicio, úsala para ordenar
    const hasFecha = list.some((p) => p?.fecha_inicio);
    if (hasFecha) {
      return [...list].sort((a, b) => {
        const da = new Date(a?.fecha_inicio || "1970-01-01").getTime();
        const db = new Date(b?.fecha_inicio || "1970-01-01").getTime();
        return da - db;
      });
    }

    // fallback: ordenar por código tipo 2025-C1
    return [...list].sort((a, b) => {
      const ka = parsePeriodoCode(getPeriodoCodigo(a)) ?? 0;
      const kb = parsePeriodoCode(getPeriodoCodigo(b)) ?? 0;
      return ka - kb;
    });
  }, [allPeriodos]);

  const currentPeriodoCode = useMemo(() => {
    const fromSelect = String(periodCode || "").trim();
    if (fromSelect) return fromSelect;

    const fromPayload = String(periodoDoc?.codigo || "").trim();
    if (fromPayload) return fromPayload;

    // fallback: último (más nuevo) si está ordenado ascendente
    const last = sortedPeriodos[sortedPeriodos.length - 1];
    return getPeriodoCodigo(last) || "";
  }, [periodCode, periodoDoc?.codigo, sortedPeriodos]);

  const periodosDropdown = useMemo(() => {
    const list = sortedPeriodos;
    if (list.length <= 11) return list;

    const idx = list.findIndex((p) => getPeriodoCodigo(p) === currentPeriodoCode);
    if (idx === -1) return list;

    const min = Math.max(0, idx - 5);
    const max = Math.min(list.length, idx + 6);
    return list.slice(min, max);
  }, [sortedPeriodos, currentPeriodoCode]);

  const alumnosFlat = useMemo(() => {
    const out = [];
    carrerasAl.forEach((c) => {
      safeArray(c?.alumnos).forEach((a) => {
        out.push({
          ...a,
          carrera_id: c.id,
          carrera_nombre: c.nombre_carrera,
          carrera_codigo: c.codigo_carrera,
        });
      });
    });
    return out;
  }, [carrerasAl]);

  const filteredAlumnos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return alumnosFlat;
    return alumnosFlat.filter((a) => {
      const n = String(a?.nombre_completo ?? "").toLowerCase();
      const e = String(a?.correo ?? "").toLowerCase();
      const m = String(a?.matricula ?? "").toLowerCase();
      const c = String(a?.carrera_nombre ?? "").toLowerCase();
      return (
        n.includes(term) ||
        e.includes(term) ||
        m.includes(term) ||
        c.includes(term)
      );
    });
  }, [alumnosFlat, search]);

  const filteredDocentes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return docentes;
    return docentes.filter((d) => {
      const n = String(d?.nombre_completo ?? "").toLowerCase();
      const e = String(d?.correo ?? "").toLowerCase();
      const m = String(d?.matricula ?? "").toLowerCase();
      const cat = String(d?.categoria ?? "").toLowerCase();
      return (
        n.includes(term) ||
        e.includes(term) ||
        m.includes(term) ||
        cat.includes(term)
      );
    });
  }, [docentes, search]);

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

  return (
    <div className="px-1 py-2">
      {/* Header */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
              Coordinación • Alumnos y Docentes
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-brand-red" />
                <span className="font-medium text-slate-800">
                  {areaAl?.nombre ?? areaDoc?.nombre ?? "—"}
                </span>
              </span>
              {periodoDoc?.codigo && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-brand-red" />
                    <span className="font-medium text-slate-800">
                      {periodoDoc.codigo}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* búsqueda global del tab */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === "alumnos"
                    ? "Buscar alumno por nombre, correo, matrícula o carrera…"
                    : "Buscar docente por nombre, correo, matrícula o categoría…"
                }
                className="w-72 max-w-full"
              />
            </div>

            {/* ✅ Dropdown de periodo (máx ±5 del actual) */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-600">Periodo</span>
              <select
                className="w-36 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                value={currentPeriodoCode}
                onChange={(e) => {
                  const code = String(e.target.value || "").trim();
                  setPeriodCode(code);
                  loadDocentes(code);
                }}
              >
                {periodosDropdown.map((p) => {
                  const code = getPeriodoCodigo(p);
                  return (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  );
                })}
              </select>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => loadDocentes(currentPeriodoCode || undefined)}
              >
                Recargar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("alumnos")}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              activeTab === "alumnos"
                ? "bg-brand-red text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Alumnos
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("docentes")}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              activeTab === "docentes"
                ? "bg-brand-red text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-1">
              <User2 className="h-3.5 w-3.5" />
              Docentes
            </span>
          </button>
        </div>
      </section>

      {/* ====== TAB ALUMNOS ====== */}
      {activeTab === "alumnos" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          {loadingAl && <Skeleton rows={8} />}

          {!loadingAl && errorAl && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div className="flex-1">{errorAl}</div>
              <Button size="sm" variant="secondary" onClick={loadAlumnos}>
                Reintentar
              </Button>
            </div>
          )}

          {!loadingAl && !errorAl && carrerasAl.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No hay carreras o alumnos asignados a tu coordinación.
            </div>
          )}

          {!loadingAl && !errorAl && carrerasAl.length > 0 && (
            <>
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Alumnos por carrera
              </div>

              {/* Vista compacta global si hay búsqueda */}
              {search.trim() ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Alumno</th>
                        <th className="px-3 py-2">Correo</th>
                        <th className="px-3 py-2">Matrícula</th>
                        <th className="px-3 py-2">Carrera</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlumnos.map((a) => (
                        <tr
                          key={a.id ?? `${a.correo}-${a.matricula}`}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-3 py-2">
                            {a.nombre_completo ?? "—"}
                          </td>
                          <td className="px-3 py-2">{a.correo ?? "—"}</td>
                          <td className="px-3 py-2">{a.matricula ?? "—"}</td>
                          <td className="px-3 py-2">
                            {a.carrera_codigo
                              ? `${a.carrera_codigo} • ${a.carrera_nombre ?? ""}`
                              : a.carrera_nombre ?? "—"}
                          </td>
                        </tr>
                      ))}
                      {filteredAlumnos.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-xs text-slate-500"
                          >
                            Sin resultados con tu búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrerasAl.map((c) => {
                    const alumnos = safeArray(c?.alumnos);
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {c.nombre_carrera ?? "Carrera"}
                          </span>
                          {c.codigo_carrera && <Pill>{c.codigo_carrera}</Pill>}
                          <Pill>{alumnos.length} alumno(s)</Pill>
                        </div>

                        {alumnos.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                            Sin alumnos registrados en esta carrera.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="min-w-full text-left text-xs">
                              <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                                <tr>
                                  <th className="px-3 py-2">Nombre</th>
                                  <th className="px-3 py-2">Correo</th>
                                  <th className="px-3 py-2">Matrícula</th>
                                </tr>
                              </thead>
                              <tbody>
                                {alumnos.map((a) => (
                                  <tr
                                    key={a.id ?? `${a.correo}-${a.matricula}`}
                                    className="border-t border-slate-100 hover:bg-slate-50"
                                  >
                                    <td className="px-3 py-2">
                                      {a.nombre_completo ?? "—"}
                                    </td>
                                    <td className="px-3 py-2">
                                      {a.correo ?? "—"}
                                    </td>
                                    <td className="px-3 py-2">
                                      {a.matricula ?? "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ====== TAB DOCENTES ====== */}
      {activeTab === "docentes" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          {loadingDoc && <Skeleton rows={8} />}

          {!loadingDoc && errorDoc && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div className="flex-1">{errorDoc}</div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => loadDocentes(currentPeriodoCode || undefined)}
              >
                Reintentar
              </Button>
            </div>
          )}

          {!loadingDoc && !errorDoc && docentes.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No hay docentes con secciones activas para este periodo.
            </div>
          )}

          {!loadingDoc && !errorDoc && docentes.length > 0 && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  Docentes del área
                </span>
                {periodoDoc?.codigo && <Pill>Periodo: {periodoDoc.codigo}</Pill>}
                {payloadDoc?.stats?.docentes != null && (
                  <Pill>{payloadDoc.stats.docentes} docente(s)</Pill>
                )}
                {payloadDoc?.stats?.secciones != null && (
                  <Pill>{payloadDoc.stats.secciones} sección(es)</Pill>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Docente</th>
                      <th className="px-3 py-2">Correo</th>
                      <th className="px-3 py-2">Matrícula</th>
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2">Carreras</th>
                      <th className="px-3 py-2 text-right">Clases en área</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocentes.map((d) => (
                      <tr
                        key={d.id ?? d.correo ?? d.nombre_completo}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2">
                          {d.nombre_completo ?? "—"}
                        </td>
                        <td className="px-3 py-2">{d.correo ?? "—"}</td>
                        <td className="px-3 py-2">{d.matricula ?? "—"}</td>
                        <td className="px-3 py-2">{d.categoria ?? "—"}</td>
                        <td className="px-3 py-2">
                          {safeArray(d.carreras).length === 0 ? (
                            "—"
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {safeArray(d.carreras).map((c) => (
                                <Pill
                                  key={
                                    c.id ??
                                    `${c.codigo_carrera}-${c.nombre_carrera}`
                                  }
                                >
                                  {c.codigo_carrera
                                    ? c.codigo_carrera
                                    : c.nombre_carrera ?? "Carrera"}
                                </Pill>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {d.total_clases_area ?? 0}
                        </td>
                      </tr>
                    ))}
                    {filteredDocentes.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-xs text-slate-500"
                        >
                          Sin resultados con tu búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
