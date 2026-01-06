// src/pages/examenes/IntentoDetalle.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Save,
  AlertTriangle,
  FileText,
  Award,
  MinusCircle
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
  return `${dd}/${mm}/${yyyy} ${hhmm}`;
}

function badgeClass(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "enviado") return "bg-blue-100 text-blue-700";
  if (e === "revisado") return "bg-green-100 text-green-700";
  if (e === "en_progreso") return "bg-amber-100 text-amber-800";
  if (e === "anulado") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function tipoLabel(tipo) {
  const map = {
    opcion_multiple: "Opción múltiple",
    verdadero_falso: "Verdadero/Falso",
    abierta: "Respuesta abierta",
    numerica: "Numérica",
    completar: "Completar",
    relacionar: "Relacionar",
    ordenar: "Ordenar",
  };
  return map[tipo] || tipo;
}

function safeJsonParse(v, fallback = null) {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return fallback;
  }
}

// Renderiza la respuesta del alumno de forma visual
function RenderRespuestaAlumno({ tipo, respuesta, contenido, respuestaCorrecta }) {
  const t = String(tipo || "").toLowerCase();
  const resp = safeJsonParse(respuesta);
  const corr = safeJsonParse(respuestaCorrecta);
  const cont = safeJsonParse(contenido);

  if (t === "opcion_multiple") {
    const opciones = safeArray(cont?.opciones);
    const seleccion = resp?.seleccion;
    const correctas = new Set(safeArray(corr?.correcta).map(Number));
    const multiple = Boolean(cont?.multiple);

    const selSet = multiple 
      ? new Set(safeArray(seleccion).map(Number)) 
      : new Set(seleccion !== null && seleccion !== undefined ? [Number(seleccion)] : []);

    return (
      <div className="space-y-2">
        {opciones.map((opc, idx) => {
          const isSelected = selSet.has(idx);
          const isCorrect = correctas.has(idx);
          
          let bgClass = "bg-white border-slate-200";
          let icon = null;

          if (isSelected && isCorrect) {
            bgClass = "bg-green-50 border-green-300";
            icon = <CheckCircle size={16} className="text-green-600" />;
          } else if (isSelected && !isCorrect) {
            bgClass = "bg-red-50 border-red-300";
            icon = <XCircle size={16} className="text-red-600" />;
          } else if (!isSelected && isCorrect) {
            bgClass = "bg-amber-50 border-amber-300";
            icon = <MinusCircle size={16} className="text-amber-600" />;
          }

          return (
            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${bgClass}`}>
              <div className="mt-0.5">{icon || <div className="w-4 h-4" />}</div>
              <span className="flex-1 text-sm text-slate-800">{opc}</span>
              {isSelected && <span className="text-xs font-medium text-slate-500">Seleccionada</span>}
              {isCorrect && !isSelected && <span className="text-xs font-medium text-amber-600">Era correcta</span>}
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "verdadero_falso") {
    const valor = resp?.valor;
    const correcto = corr?.correcta;
    const isCorrect = valor === correcto;

    return (
      <div className="grid grid-cols-2 gap-4">
        {[true, false].map((v) => {
          const isSelected = valor === v;
          const isCorrectOption = correcto === v;
          
          let bgClass = "bg-white border-slate-200";
          if (isSelected && isCorrect) bgClass = "bg-green-50 border-green-300";
          else if (isSelected && !isCorrect) bgClass = "bg-red-50 border-red-300";
          else if (isCorrectOption && !isSelected) bgClass = "bg-amber-50 border-amber-300";

          return (
            <div key={String(v)} className={`p-4 rounded-lg border text-center ${bgClass}`}>
              <div className="text-lg font-bold mb-1">{v ? "Verdadero" : "Falso"}</div>
              {isSelected && (
                <div className={`text-xs font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                  {isCorrect ? "✓ Correcto" : "✗ Incorrecto"}
                </div>
              )}
              {isCorrectOption && !isSelected && (
                <div className="text-xs font-medium text-amber-600">Era la correcta</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "abierta") {
    const texto = resp?.texto || "";
    const keywords = safeArray(corr?.keywords);

    return (
      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-2">Respuesta del alumno:</div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap">{texto || <em className="text-slate-400">Sin respuesta</em>}</div>
        </div>
        
        {keywords.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs font-medium text-blue-700 mb-2">Palabras clave esperadas:</div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, i) => {
                const found = texto.toLowerCase().includes(kw.toLowerCase());
                return (
                  <span 
                    key={i} 
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      found ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {kw} {found && "✓"}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (t === "numerica") {
    const valor = resp?.valor;
    const correcto = corr?.valor;
    const tolerancia = corr?.tolerancia || 0;
    
    const numValor = Number(valor);
    const numCorrecto = Number(correcto);
    const isCorrect = Math.abs(numValor - numCorrecto) <= tolerancia;

    return (
      <div className="space-y-3">
        <div className={`p-4 rounded-lg border ${isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
          <div className="text-xs font-medium text-slate-500 mb-1">Respuesta del alumno:</div>
          <div className="text-2xl font-bold">{valor || "-"}</div>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-1">Respuesta correcta:</div>
          <div className="text-lg font-semibold">{correcto}</div>
          {tolerancia > 0 && <div className="text-xs text-slate-500 mt-1">Tolerancia: ±{tolerancia}</div>}
        </div>
      </div>
    );
  }

  if (t === "completar") {
    const blanks = safeArray(cont?.blanks);
    const respBlanks = safeArray(resp?.blanks);
    const corrBlanks = safeArray(corr?.blanks);

    const respMap = new Map();
    for (const b of respBlanks) {
      const id = b?.id ?? b?.blank_id ?? b?.index;
      respMap.set(String(id), b?.valor ?? b?.value ?? "");
    }

    const corrMap = new Map();
    for (const b of corrBlanks) {
      const id = b?.id ?? b?.blank_id ?? b?.index;
      corrMap.set(String(id), b?.valor ?? b?.value ?? "");
    }

    return (
      <div className="space-y-3">
        {blanks.map((blank, idx) => {
          const bid = String(blank?.id ?? idx);
          const respVal = respMap.get(bid) || "";
          const corrVal = corrMap.get(bid) || "";
          const isCorrect = respVal.toLowerCase().trim() === corrVal.toLowerCase().trim();

          return (
            <div key={bid} className={`p-4 rounded-lg border ${isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
              <div className="text-xs font-medium text-slate-500 mb-2">Espacio #{bid}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Respuesta:</div>
                  <div className="font-medium">{respVal || <em className="text-slate-400">-</em>}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Correcta:</div>
                  <div className="font-medium text-green-700">{corrVal}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "relacionar") {
    const izq = safeArray(cont?.izq);
    const der = safeArray(cont?.der);
    const respMatches = safeArray(resp?.matches);
    const corrMatches = safeArray(corr?.matches);

    const corrMap = new Map();
    for (const m of corrMatches) {
      corrMap.set(String(m?.izq_id), String(m?.der_id));
    }

    const derMap = new Map();
    for (const d of der) {
      derMap.set(String(d?.id), d?.texto);
    }

    return (
      <div className="space-y-3">
        {izq.map((l) => {
          const lid = String(l?.id);
          const respMatch = respMatches.find((m) => String(m?.izq_id) === lid);
          const respDerId = respMatch ? String(respMatch.der_id) : null;
          const corrDerId = corrMap.get(lid);
          const isCorrect = respDerId === corrDerId;

          return (
            <div key={lid} className={`p-4 rounded-lg border ${isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
              <div className="text-sm font-medium text-slate-900 mb-2">{l?.texto}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Respuesta:</div>
                  <div>{respDerId ? derMap.get(respDerId) || "-" : <em className="text-slate-400">Sin respuesta</em>}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Correcta:</div>
                  <div className="text-green-700">{corrDerId ? derMap.get(corrDerId) || "-" : "-"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "ordenar") {
    const items = safeArray(cont?.items || cont?.opciones);
    const respOrden = safeArray(resp?.orden);
    const corrOrden = safeArray(corr?.orden);

    return (
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">Orden del alumno:</div>
          <ol className="space-y-2">
            {respOrden.map((idx, pos) => {
              const isCorrect = corrOrden[pos] === idx;
              return (
                <li 
                  key={pos} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                    {pos + 1}
                  </span>
                  <span className="text-sm">{items[idx] || `Opción ${idx}`}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">Orden correcto:</div>
          <ol className="space-y-2">
            {corrOrden.map((idx, pos) => (
              <li key={pos} className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-300">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                  {pos + 1}
                </span>
                <span className="text-sm">{items[idx] || `Opción ${idx}`}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  // Fallback para tipos no reconocidos
  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <pre className="text-xs text-slate-600 overflow-auto">{JSON.stringify(resp, null, 2)}</pre>
    </div>
  );
}

export default function IntentoDetalle({ currentUser }) {
  const { seccionId, intentoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [intento, setIntento] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  
  // Para calificación manual
  const [califManual, setCalifManual] = useState("");
  const [comentarios, setComentarios] = useState("");

  useEffect(() => {
    if (!intentoId) {
      setError("ID de intento inválido");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/examenes/intento/${intentoId}/detalle`);
        const data = unwrapResponse(res.data);
        
        setIntento(data?.intento);
        setPreguntas(safeArray(data?.preguntas));
        setCalifManual(data?.intento?.calif_final ?? data?.intento?.calif_auto ?? "");
      } catch (e) {
        setError(e?.response?.data?.response || e?.message || "Error al cargar intento");
      } finally {
        setLoading(false);
      }
    })();
  }, [intentoId]);

  const calificar = async () => {
    if (!intentoId) return;
    
    const calif = parseFloat(califManual);
    if (isNaN(calif) || calif < 0 || calif > 10) {
      setError("La calificación debe ser un número entre 0 y 10");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.post(`/api/examenes/intento/${intentoId}/calificar`, {
        calif_final: calif,
        comentarios: comentarios,
      });
      
      // Recargar datos
      const res = await api.get(`/api/examenes/intento/${intentoId}/detalle`);
      const data = unwrapResponse(res.data);
      setIntento(data?.intento);
      setPreguntas(safeArray(data?.preguntas));
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al calificar");
    } finally {
      setSaving(false);
    }
  };

  const totalPuntos = useMemo(() => {
    return preguntas.reduce((sum, p) => sum + Number(p?.puntos_max ?? 0), 0);
  }, [preguntas]);

  const puntosObtenidos = useMemo(() => {
    return preguntas.reduce((sum, p) => sum + Number(p?.puntos_obtenidos ?? 0), 0);
  }, [preguntas]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !intento) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!intento) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No se encontró el intento
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline_secondary"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Volver
          </Button>

          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Intento #{intento.intento_num}
            </h1>
            <div className="text-sm text-slate-600 mt-0.5">
              Inscripción #{intento.inscripcion_id}
            </div>
          </div>
        </div>

        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${badgeClass(intento.estado)}`}>
          {String(intento.estado || "-")}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de información y calificación */}
        <div className="lg:col-span-1 space-y-4">
          {/* Resumen */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Award size={18} className="text-brand-red" />
              Calificación
            </h2>

            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-brand-red">
                {Number(intento.calif_final ?? intento.calif_auto ?? 0).toFixed(2)}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {puntosObtenidos.toFixed(2)} / {totalPuntos.toFixed(2)} puntos
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Calif. automática</span>
                <span className="font-medium">{Number(intento.calif_auto ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Calif. final</span>
                <span className="font-medium">{Number(intento.calif_final ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tiempos */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-slate-500" />
              Tiempos
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <div className="text-slate-600">Inicio</div>
                <div className="font-medium">{formatMx(intento.inicio_real)}</div>
              </div>
              <div>
                <div className="text-slate-600">Fin</div>
                <div className="font-medium">{formatMx(intento.fin_real)}</div>
              </div>
            </div>
          </div>

          {/* Calificación manual */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-slate-500" />
              Calificación manual
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Calificación final
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={califManual}
                  onChange={(e) => setCalifManual(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Comentarios (opcional)
                </label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="Observaciones..."
                />
              </div>

              <Button
                variant="primary"
                onClick={calificar}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {saving ? "Guardando..." : "Guardar calificación"}
              </Button>
            </div>
          </div>
        </div>

        {/* Preguntas */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Respuestas ({preguntas.length} preguntas)
            </h2>

            <div className="space-y-6">
              {preguntas.map((p, idx) => {
                const puntosObt = Number(p?.puntos_obtenidos ?? 0);
                const puntosMax = Number(p?.puntos_max ?? 1);
                const porcentaje = puntosMax > 0 ? (puntosObt / puntosMax) * 100 : 0;

                return (
                  <div 
                    key={p.pregunta_version_id || idx} 
                    className="rounded-xl border border-slate-200 overflow-hidden"
                  >
                    {/* Header de pregunta */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-sm font-bold">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              {p.enunciado}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="px-2 py-0.5 rounded bg-slate-200">
                                {tipoLabel(p.tipo)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-lg font-bold ${
                            porcentaje === 100 ? "text-green-600" : 
                            porcentaje > 0 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {puntosObt.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">
                            / {puntosMax.toFixed(2)} pts
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido de respuesta */}
                    <div className="p-4">
                      <RenderRespuestaAlumno
                        tipo={p.tipo}
                        respuesta={p.respuesta_alumno}
                        contenido={p.contenido}
                        respuestaCorrecta={p.respuesta_correcta}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}