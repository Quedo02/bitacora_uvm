// src/components/bitacora/BitacoraImportWizard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

import {
  Upload,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Settings2,
  Search,
} from "lucide-react";

import {
  parseBlackboardXlsx,
  parseTeamsXlsx,
  normalizeWeightsTo100,
} from "../../utils/bitacoraImport";

const PARCIALES = [
  { label: "Parcial 1", value: 1 },
  { label: "Parcial 2", value: 2 },
  { label: "Parcial 3", value: 3 },
];

function pct(n) {
  if (n == null) return "—";
  return `${Number(n).toFixed(2)}%`;
}

function clampNum(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Para captura manual 0..10
function clampCalif(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 10) return 10;
  return Math.round(n * 100) / 100;
}

export default function BitacoraImportWizard({
  open,
  onClose,
  componente = "blackboard", // "blackboard" | "continua"
  defaultParcial = 1,
  alumnos = [], // ✅ NUEVO: lista alumnos para modo manual
  onConfirm = async () => {},
}) {
  const inputRef = useRef(null);

  const [step, setStep] = useState(0); // 0 archivo | 1 config | 2 resumen/califs
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const [err, setErr] = useState("");
  const [loadingParse, setLoadingParse] = useState(false);
  const [submitting, setSubmitting] = useState(false); // ✅ NUEVO

  // continua: excel (Teams) o manual
  const [continuaModo, setContinuaModo] = useState("excel"); // excel | manual

  // configuración común
  const [parcial, setParcial] = useState(defaultParcial);

  // Blackboard config
  const [pesoMode, setPesoMode] = useState("parcial"); // parcial | total
  const [selectedActs, setSelectedActs] = useState([]); // keys
  const [weights, setWeights] = useState({}); // key -> number|string
  const [searchAct, setSearchAct] = useState("");

  // Continua manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualPeso, setManualPeso] = useState("");

  // ✅ NUEVO: calificaciones manuales + buscador alumno
  const [manualCalifs, setManualCalifs] = useState({}); // key(matricula/id) -> string/number
  const [searchAlumno, setSearchAlumno] = useState("");

  // parsed data
  const [parsed, setParsed] = useState(null);

  useEffect(() => {
    if (!open) return;
    // reset suave cuando abres
    setStep(0);
    setErr("");
    setFiles([]);
    setParsed(null);
    setSelectedActs([]);
    setWeights({});
    setSearchAct("");
    setParcial(defaultParcial);
    setPesoMode("parcial");
    setContinuaModo("excel");
    setManualNombre("");
    setManualPeso("");
    setManualCalifs({});
    setSearchAlumno("");
    setSubmitting(false);
  }, [open, defaultParcial]);

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    const onlyExcel = incoming.filter((f) => /\.(xlsx|xls)$/i.test(f.name));
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name + f.size, f]));
      onlyExcel.forEach((f) => map.set(f.name + f.size, f));
      return Array.from(map.values()).slice(0, 1); // solo 1 archivo
    });
  };

  const removeFile = () => {
    setFiles([]);
    setParsed(null);
    setSelectedActs([]);
    setWeights({});
    setErr("");
    setStep(0);
  };

  const parseFile = async () => {
    setErr("");

    if (componente === "continua" && continuaModo === "manual") {
      // no hay archivo que parsear
      setParsed({ fuente: "manual", tipo: "continua" });
      setStep(1);
      return;
    }

    const file = files[0];
    if (!file) return setErr("Adjunta un archivo Excel.");

    setLoadingParse(true);
    try {
      const data =
        componente === "blackboard"
          ? await parseBlackboardXlsx(file)
          : await parseTeamsXlsx(file);

      setParsed(data);

      // defaults
      if (data?.tipo === "blackboard") {
        const defaultSelected = (data.actividades || [])
          .filter((a) => (a.nonNullCount || 0) > 0)
          .map((a) => a.key);

        setSelectedActs(defaultSelected);

        // pesos por defecto: iguales
        if (defaultSelected.length > 0) {
          const eq = 100 / defaultSelected.length;
          const w = {};
          defaultSelected.forEach((k) => (w[k] = eq));
          setWeights(w);
        }
      }

      if (data?.fuente === "teams" && data?.actividad?.key) {
        const k = data.actividad.key;
        setSelectedActs([k]);
        setWeights({ [k]: 100 });
      }

      setStep(1);
    } catch (e) {
      setErr(e?.message || "No pude analizar el archivo.");
    } finally {
      setLoadingParse(false);
    }
  };

  const actsFiltered = useMemo(() => {
    const acts = parsed?.actividades || [];
    const s = (searchAct || "").toLowerCase().trim();
    if (!s) return acts;
    return acts.filter((a) => (a.nombre || "").toLowerCase().includes(s));
  }, [parsed, searchAct]);

  const selectedSum = useMemo(() => {
    return (selectedActs || []).reduce(
      (acc, k) => acc + (Number(weights[k]) || 0),
      0
    );
  }, [selectedActs, weights]);

  const applyNormalize = () => {
    const { normalized } = normalizeWeightsTo100(weights, selectedActs);
    setWeights(normalized);
  };

  const setEqualWeights = () => {
    if (!selectedActs.length) return;
    const eq = 100 / selectedActs.length;
    const w = { ...weights };
    selectedActs.forEach((k) => (w[k] = eq));
    setWeights(w);
  };

  const toggleAct = (key) => {
    setSelectedActs((prev) => {
      const has = prev.includes(key);
      const next = has ? prev.filter((k) => k !== key) : [...prev, key];

      // si agregas, pon default 0 si no existe
      setWeights((wprev) => {
        const w = { ...wprev };
        if (!has && w[key] == null) w[key] = 0;
        return w;
      });

      return next;
    });
  };

  // ✅ NUEVO: alumnos filtrados + contador capturadas
  const filteredAlumnos = useMemo(() => {
    if (!searchAlumno.trim()) return alumnos || [];
    const s = searchAlumno.toLowerCase();
    return (alumnos || []).filter((a) => {
      const nombre = String(a?.nombre || a?.nombreCompleto || "").toLowerCase();
      const matricula = String(a?.matricula || "");
      const correo = String(a?.correo || a?.email || "").toLowerCase();
      return nombre.includes(s) || matricula.includes(s) || correo.includes(s);
    });
  }, [alumnos, searchAlumno]);

  const califsCapturadas = useMemo(() => {
    return Object.values(manualCalifs).filter((v) => v !== "" && v != null)
      .length;
  }, [manualCalifs]);

  const updateManualCalif = (key, value) => {
    setManualCalifs((prev) => ({ ...prev, [key]: value }));
  };

  const canGoResumen = () => {
    if (componente === "continua" && continuaModo === "manual") {
      const n = manualNombre.trim();
      const p = clampNum(manualPeso);
      if (!n) return "Falta el nombre de la actividad.";
      if (p <= 0) return "Falta el peso (debe ser > 0).";
      // OJO: aquí NO obligamos califs; puedes dejar en blanco.
      return "";
    }

    if (!parsed) return "No hay datos parseados.";

    if (componente === "blackboard") {
      if (!selectedActs.length) return "Selecciona al menos 1 actividad.";
      if (selectedSum <= 0) return "Tus ponderaciones están en 0.";
      if (pesoMode === "parcial") {
        const diff = Math.abs(selectedSum - 100);
        if (diff > 0.5)
          return "Las ponderaciones deben sumar 100% (modo dentro del parcial).";
      }
    }

    if (componente === "continua" && parsed?.fuente === "teams") {
      const k = parsed?.actividad?.key;
      if (!k) return "No detecté la actividad del archivo.";
      const w = clampNum(weights[k]);
      if (w <= 0) return "Falta el peso de la actividad.";
    }

    return "";
  };

  const goResumen = () => {
    setErr("");
    if (componente === "blackboard" && pesoMode === "total") {
      applyNormalize();
    }

    const msg = canGoResumen();
    if (msg) return setErr(msg);

    setStep(2);
  };

  const handleConfirm = async () => {
    setErr("");
    setSubmitting(true);

    try {
      const isManual = componente === "continua" && continuaModo === "manual";

      // ✅ NUEVO: construir filas manuales (solo las capturadas)
      let manualFilas = null;
      if (isManual) {
        const rows = (alumnos || [])
          .map((al) => {
            const key = al?.matricula || al?.id; // key en el state
            const raw = manualCalifs[key];
            const calif = clampCalif(raw);

            // Identificador para backend (prioriza matrícula, si no correo, si no id)
            const identificador = String(
              al?.matricula || al?.correo || al?.email || al?.id || ""
            );

            return {
              identificador,
              alumno_id: al?.id ?? null, // extra útil (si backend lo ignora no pasa nada)
              calificaciones: calif != null ? [calif] : [null],
            };
          })
          .filter((r) => r.calificaciones[0] != null);

        manualFilas = rows;
      }

      const payload = {
        componente,
        fuente: isManual
          ? "manual"
          : componente === "blackboard"
          ? "blackboard"
          : "teams",
        parcial,
        pesoMode, // parcial | total
        actividades: isManual
          ? [
              {
                key: manualNombre.trim(),
                nombre: manualNombre.trim(),
                peso: clampNum(manualPeso),
              },
            ]
          : selectedActs.map((k) => ({
              key: k,
              nombre:
                parsed?.actividad?.key === k
                  ? parsed?.actividad?.nombre
                  : (parsed?.actividades || []).find((a) => a.key === k)
                      ?.nombre || k,
              peso: clampNum(weights[k]),
            })),
        parsed: isManual ? null : parsed, // manual no necesita parsed
        manualFilas, // ✅ NUEVO
      };

      await onConfirm(payload);
      onClose();
    } catch (e) {
      setErr(e?.message || "No se pudo confirmar.");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    componente === "blackboard"
      ? "Importar Blackboard a Bitácora"
      : "Importar Evaluación Continua a Bitácora";

  const labels = [
    "Archivo",
    "Configuración",
    componente === "continua" && continuaModo === "manual"
      ? "Calificaciones"
      : "Resumen",
  ];

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={submitting}>
        Cancelar
      </Button>

      {step > 0 && (
        <Button
          variant="outline_secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
      )}

      {step === 0 && (
        <Button onClick={parseFile} disabled={loadingParse || submitting}>
          {loadingParse ? "Analizando..." : "Continuar"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}

      {step === 1 && (
        <Button onClick={goResumen} disabled={submitting}>
          {componente === "continua" && continuaModo === "manual"
            ? "Capturar Calificaciones"
            : "Resumen"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}

      {step === 2 && (
        <Button onClick={handleConfirm} disabled={submitting}>
          {submitting ? (
            "Guardando..."
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar
            </>
          )}
        </Button>
      )}
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      scrollable
      footer={footer}
    >
      {/* Stepper (mismo estilo del 1ro, pero label dinámico) */}
      <div className="flex items-center gap-2 text-xs mb-4">
        {labels.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                "h-6 w-6 rounded-full flex items-center justify-center font-semibold",
                i <= step
                  ? "bg-brand-red text-white"
                  : "bg-slate-200 text-slate-600",
              ].join(" ")}
            >
              {i + 1}
            </div>
            <span className={i <= step ? "text-slate-800" : "text-slate-500"}>
              {s}
            </span>
            {i < 2 && <span className="text-slate-300">—</span>}
          </div>
        ))}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>{err}</div>
        </div>
      )}

      {/* STEP 0: Archivo */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Config previa para continua */}
          {componente === "continua" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Modo"
                value={continuaModo}
                onChange={(e) => {
                  setContinuaModo(e.target.value);
                  setErr("");
                  removeFile();
                }}
              >
                <option value="excel">Excel (Teams)</option>
                <option value="manual">Manual</option>
              </Select>

              <Select
                label="Parcial"
                value={parcial}
                onChange={(e) => setParcial(Number(e.target.value))}
              >
                {PARCIALES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {componente === "blackboard" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 flex items-start gap-2">
                <Settings2 className="h-4 w-4 mt-0.5 text-slate-500" />
                <div>
                  <div className="font-semibold text-slate-700">Fuente</div>
                  <div>Blackboard (fija)</div>
                </div>
              </div>

              <Select
                label="Parcial"
                value={parcial}
                onChange={(e) => setParcial(Number(e.target.value))}
              >
                {PARCIALES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Manual (continua) */}
          {componente === "continua" && continuaModo === "manual" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">
                Crear actividad (Manual)
              </div>

              <Input
                label="Nombre de la actividad"
                value={manualNombre}
                onChange={(e) => setManualNombre(e.target.value)}
                placeholder="Ej. Proyecto 1"
              />

              <Input
                label="Peso dentro de Evaluación Continua del parcial (%)"
                value={manualPeso}
                onChange={(e) => setManualPeso(e.target.value)}
                placeholder="Ej. 25"
              />

              <div className="text-xs text-slate-500">
                En el siguiente paso podrás capturar calificaciones de{" "}
                <b>{alumnos.length}</b> alumnos (opcional).
              </div>
            </div>
          ) : (
            <div
              className={[
                "rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer",
                dragOver
                  ? "border-brand-red bg-red-50"
                  : "border-slate-300 bg-slate-50",
              ].join(" ")}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <Upload className="h-10 w-10 mx-auto text-slate-400" />
              <div className="mt-3 font-semibold text-slate-800">
                Arrastra tu Excel aquí o haz click para seleccionar
              </div>
              <div className="mt-1 text-xs text-slate-500">.xlsx / .xls</div>

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>
          )}

          {files.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                Archivos seleccionados ({files.length})
              </div>
              <ul className="divide-y divide-slate-100">
                {files.map((f) => (
                  <li
                    key={f.name + f.size}
                    className="flex items-center justify-between gap-3 px-4 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-900">
                        {f.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {Math.round(f.size / 1024)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      onClick={removeFile}
                    >
                      <Trash2 className="h-4 w-4" />
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-700">
              Instrucciones rápidas
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {componente === "blackboard" ? (
                <>
                  <li>
                    Selecciona SOLO las actividades del parcial que vas a
                    cargar.
                  </li>
                  <li>Las calificaciones se manejan base 10.</li>
                  <li>
                    Las ponderaciones se guardan dentro del parcial (suman
                    100%).
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Teams: normalmente el Excel trae UNA actividad por archivo.
                  </li>
                  <li>Se convierte a base 10 usando: (score / puntos) * 10.</li>
                  <li>
                    Manual: crea la actividad y puedes capturar calificaciones
                    aquí mismo.
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* STEP 1: Configuración (se queda como el 1ro) */}
      {step === 1 && (
        <div className="space-y-4">
          {componente === "blackboard" && parsed?.tipo === "blackboard" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Archivo</div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                    {parsed.fileName}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Detecté <b>{parsed.alumnos?.length || 0}</b> alumnos y{" "}
                    <b>{parsed.actividades?.length || 0}</b> actividades.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500 mb-1">
                    Modo de ponderación
                  </div>
                  <Select
                    value={pesoMode}
                    onChange={(e) => setPesoMode(e.target.value)}
                  >
                    <option value="parcial">
                      Dentro del parcial (suma 100%)
                    </option>
                    <option value="total">
                      Como “sobre el total” (yo lo normalizo)
                    </option>
                  </Select>
                  <div className="mt-2 text-xs text-slate-500">
                    Si capturas 5,10,20 → se convierte a 14.29, 28.57, 57.14.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500 mb-1">
                    Buscar actividad
                  </div>
                  <Input
                    value={searchAct}
                    onChange={(e) => setSearchAct(e.target.value)}
                    placeholder="Ej. Actividad 1"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline_secondary"
                      onClick={setEqualWeights}
                    >
                      Repartir igual
                    </Button>
                    <Button
                      size="sm"
                      variant="outline_secondary"
                      onClick={applyNormalize}
                    >
                      Normalizar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                  Selecciona actividades y pon ponderación
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                          Usar
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                          Actividad
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                          # califs
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                          Peso (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {actsFiltered.map((a) => {
                        const checked = selectedActs.includes(a.key);
                        return (
                          <tr
                            key={a.key}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAct(a.key)}
                              />
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              {a.nombre}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-600">
                              {a.nonNullCount || 0}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={!checked}
                                value={weights[a.key] ?? ""}
                                onChange={(e) =>
                                  setWeights((w) => ({
                                    ...w,
                                    [a.key]: e.target.value,
                                  }))
                                }
                                className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red disabled:bg-slate-100"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {actsFiltered.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            No hay actividades con ese filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-3 text-xs text-slate-600 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    Seleccionadas: <b>{selectedActs.length}</b>
                  </div>
                  <div>
                    Suma pesos: <b>{pct(selectedSum)}</b>{" "}
                    {pesoMode === "parcial"
                      ? "(debe ser 100%)"
                      : "(se normaliza al confirmar)"}
                  </div>
                </div>
              </div>
            </>
          )}

          {componente === "continua" && parsed?.fuente === "teams" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">
                  Actividad detectada (Teams)
                </div>
                <div className="font-semibold text-slate-900">
                  {parsed.actividad?.nombre}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Alumnos detectados: <b>{parsed.alumnos?.length || 0}</b>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Parcial"
                    value={parcial}
                    onChange={(e) => setParcial(Number(e.target.value))}
                  >
                    {PARCIALES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="Peso dentro de Evaluación Continua del parcial (%)"
                    value={weights[parsed.actividad?.key] ?? ""}
                    onChange={(e) =>
                      setWeights((w) => ({
                        ...w,
                        [parsed.actividad?.key]: e.target.value,
                      }))
                    }
                    placeholder="Ej. 25"
                  />
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Teams se convierte a base 10 usando (score / puntos) * 10.
                </div>
              </div>
            </div>
          )}

          {componente === "continua" && continuaModo === "manual" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900 mb-1">
                Manual listo
              </div>
              <div className="text-xs text-slate-600">
                Actividad: <b>{manualNombre || "—"}</b> — Peso:{" "}
                <b>{manualPeso || "—"}%</b> — Parcial: <b>{parcial}</b>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Resumen / Calificaciones manuales */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Resumen</div>
            <div className="mt-2 text-sm text-slate-700 space-y-1">
              <div>
                <b>Componente:</b> {componente}
              </div>
              <div>
                <b>Parcial:</b> {parcial}
              </div>
              <div>
                <b>Fuente:</b>{" "}
                {componente === "blackboard"
                  ? "Blackboard"
                  : continuaModo === "manual"
                  ? "Manual"
                  : "Teams"}
              </div>
            </div>

            {componente === "blackboard" && (
              <div className="mt-3 text-sm text-slate-700">
                <b>Actividades:</b>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {selectedActs.map((k) => {
                    const a = (parsed?.actividades || []).find(
                      (x) => x.key === k
                    );
                    return (
                      <li key={k}>
                        {a?.nombre || k} — <b>{pct(weights[k])}</b>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {componente === "continua" && continuaModo === "manual" && (
              <div className="mt-3 text-sm text-slate-700">
                <b>Actividad:</b> {manualNombre} — <b>{manualPeso}%</b>
              </div>
            )}

            {componente === "continua" && parsed?.fuente === "teams" && (
              <div className="mt-3 text-sm text-slate-700">
                <b>Actividad:</b> {parsed.actividad?.nombre} —{" "}
                <b>{pct(weights[parsed.actividad?.key])}</b>
              </div>
            )}
          </div>

          {/* ✅ NUEVO: Captura manual (solo continua + manual) con UI estilo 1ro */}
          {componente === "continua" && continuaModo === "manual" && (
            <>
              {alumnos.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-700">
                        Capturar calificaciones
                      </div>
                      <div className="text-xs text-slate-500">
                        Capturadas: <b>{califsCapturadas}</b> de{" "}
                        <b>{alumnos.length}</b> alumnos
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar alumno..."
                        value={searchAlumno}
                        onChange={(e) => setSearchAlumno(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1 w-56 focus:outline-none focus:ring-1 focus:ring-brand-red"
                      />
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                            Matrícula
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                            Alumno
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 w-36">
                            Calificación (0-10)
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredAlumnos.map((al) => {
                          const key = al?.matricula || al?.id;
                          const value = manualCalifs[key] ?? "";
                          const numVal = clampCalif(value);
                          const isReprobado = numVal != null && numVal < 6;

                          const nombre =
                            al?.nombre || al?.nombreCompleto || "—";
                          const correo = al?.correo || al?.email || "—";

                          return (
                            <tr
                              key={al?.id ?? key}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-3 py-2 font-mono text-xs text-slate-600">
                                {al?.matricula || "—"}
                              </td>

                              <td className="px-3 py-2">
                                <div className="text-slate-800 font-medium">
                                  {nombre}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {correo}
                                </div>
                              </td>

                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={value}
                                  onChange={(e) =>
                                    updateManualCalif(key, e.target.value)
                                  }
                                  placeholder="—"
                                  className={[
                                    "w-full px-3 py-1.5 text-center text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/50",
                                    isReprobado
                                      ? "border-red-300 bg-red-50 text-red-700 font-semibold"
                                      : value !== ""
                                      ? "border-green-300 bg-green-50"
                                      : "border-slate-300",
                                  ].join(" ")}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredAlumnos.length === 0 && (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                      No se encontraron alumnos
                    </div>
                  )}

                  <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 text-xs text-slate-600">
                    💡 Puedes dejar en blanco alumnos sin calificación. Solo se
                    guardan las que captures.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5" />
                  <div>
                    No hay alumnos disponibles. La actividad se creará sin
                    calificaciones.
                  </div>
                </div>
              )}
            </>
          )}

          {/* Preview calificaciones Excel (igual que tu 1ro) */}
          {parsed?.alumnos?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                Vista previa (primeros 10 alumnos) — valores leídos del Excel
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                        Alumno
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                        Identificador
                      </th>

                      {componente === "blackboard" &&
                        selectedActs.map((k) => {
                          const meta = (parsed?.actividades || []).find(
                            (x) => x.key === k
                          );
                          const name = meta?.nombre || k;
                          return (
                            <th
                              key={k}
                              className="px-3 py-2 text-center text-xs font-semibold text-slate-600"
                              title={name}
                            >
                              <div className="max-w-[160px] truncate">
                                {name}
                              </div>
                            </th>
                          );
                        })}

                      {componente !== "blackboard" && (
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                          Calificación (base 10)
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {parsed.alumnos.slice(0, 10).map((al, i) => {
                      const ident = al.matricula || al.email || "—";
                      const nombre = al.nombreCompleto || "—";

                      return (
                        <tr
                          key={`${ident}-${i}`}
                          className="border-b border-slate-100"
                        >
                          <td className="px-3 py-2 text-slate-800">{nombre}</td>
                          <td className="px-3 py-2 text-slate-600 font-mono text-xs">
                            {ident}
                          </td>

                          {componente === "blackboard" ? (
                            selectedActs.length > 0 ? (
                              selectedActs.map((k) => {
                                const v = al?.calificaciones?.[k];
                                const n =
                                  v == null || v === "" ? null : Number(v);
                                const show =
                                  n == null || !Number.isFinite(n)
                                    ? "—"
                                    : n.toFixed(2);

                                return (
                                  <td key={k} className="px-3 py-2 text-center">
                                    <span
                                      className={
                                        n != null && n < 6
                                          ? "font-semibold text-red-600"
                                          : "font-semibold text-slate-700"
                                      }
                                    >
                                      {show}
                                    </span>
                                  </td>
                                );
                              })
                            ) : (
                              <td
                                className="px-3 py-2 text-center text-slate-500"
                                colSpan={1}
                              >
                                (Selecciona actividades para ver valores)
                              </td>
                            )
                          ) : (
                            <td className="px-3 py-2 text-center">
                              {al.calificacion10 == null ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <span
                                  className={
                                    Number(al.calificacion10) < 6
                                      ? "font-semibold text-red-600"
                                      : "font-semibold text-slate-700"
                                  }
                                >
                                  {Number(al.calificacion10).toFixed(2)}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {componente === "blackboard" &&
                selectedActs.length > 0 &&
                (() => {
                  const any = (parsed.alumnos || []).some((al) =>
                    selectedActs.some(
                      (k) =>
                        al?.calificaciones?.[k] != null &&
                        al?.calificaciones?.[k] !== ""
                    )
                  );
                  return !any ? (
                    <div className="px-4 py-3 text-xs text-amber-800 bg-amber-50 border-t border-amber-200">
                      No estoy viendo valores numéricos en las columnas
                      seleccionadas. Si tu Excel trae fórmulas, ábrelo en Excel
                      y guarda, o pega “valores” antes de importar.
                    </div>
                  ) : null;
                })()}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
