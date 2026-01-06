// src/pages/examenes/ResultadoAlumno.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import PreguntaRenderer, {
  applyOrdenToContenido,
  safeJsonParse,
} from "../components/examenes/PreguntaRenderer";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Trophy,
  TrendingUp,
  FileText,
  Eye,
} from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "response" in data)
    return data.response;
  return data;
}

function safeArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.values(v); // <- clave
  return [];
}

function formatMx(mysqlDt) {
  if (!mysqlDt) return "-";
  const [d, t] = String(mysqlDt).split(" ");
  if (!d) return String(mysqlDt);
  const [yyyy, mm, dd] = d.split("-");
  const hhmm = (t || "").slice(0, 5);
  return `${dd}/${mm}/${yyyy} ${hhmm}`;
}

function getGradeColor(grade) {
  if (grade >= 9) return "text-green-600";
  if (grade >= 7) return "text-blue-600";
  if (grade >= 6) return "text-amber-600";
  return "text-red-600";
}

function getGradeBg(grade) {
  if (grade >= 9) return "bg-green-100 border-green-200";
  if (grade >= 7) return "bg-blue-100 border-blue-200";
  if (grade >= 6) return "bg-amber-100 border-amber-200";
  return "bg-red-100 border-red-200";
}

function getGradeLabel(grade) {
  if (grade >= 9) return "Excelente";
  if (grade >= 8) return "Muy bien";
  if (grade >= 7) return "Bien";
  if (grade >= 6) return "Aprobado";
  return "Necesitas mejorar";
}

export default function ResultadoAlumno({ currentUser }) {
  const { examenId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState("");

  const [examenInfo, setExamenInfo] = useState(null);
  const [intentos, setIntentos] = useState([]);
  const [intentoSeleccionado, setIntentoSeleccionado] = useState(null);
  const [detalleIntento, setDetalleIntento] = useState(null);

  useEffect(() => {
    if (!examenId) {
      setError("ID de examen inválido");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");

      try {
        const [exRes, intRes] = await Promise.all([
          api.get(`/api/examenes/examen/${examenId}`),
          api.get(`/api/examenes/mis-intentos/${examenId}`),
        ]);

        setExamenInfo(unwrapResponse(exRes.data)?.examen);

        const intentosData = safeArray(unwrapResponse(intRes.data));
        setIntentos(intentosData);

        if (intentosData.length > 0) {
          const mejor = intentosData.reduce((prev, curr) => {
            const califPrev = Number(prev.calif_final ?? prev.calif_auto ?? 0);
            const califCurr = Number(curr.calif_final ?? curr.calif_auto ?? 0);
            return califCurr > califPrev ? curr : prev;
          });
          setIntentoSeleccionado(mejor.id);
        }
      } catch (e) {
        setError(
          e?.response?.data?.response ||
            e?.message ||
            "Error al cargar resultados"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [examenId]);

  useEffect(() => {
    if (!intentoSeleccionado) {
      setDetalleIntento(null);
      return;
    }

    (async () => {
      setLoadingDetalle(true);
      try {
        const res = await api.get(
          `/api/examenes/intento/${intentoSeleccionado}/detalle`
        );
        setDetalleIntento(unwrapResponse(res.data));
      } catch (e) {
        setDetalleIntento(null);
      } finally {
        setLoadingDetalle(false);
      }
    })();
  }, [intentoSeleccionado]);

  const mejorCalificacion = useMemo(() => {
    if (!intentos.length) return 0;
    return Math.max(
      ...intentos.map((i) => Number(i.calif_final ?? i.calif_auto ?? 0))
    );
  }, [intentos]);

  const estadisticas = useMemo(() => {
    const preguntas = safeArray(detalleIntento?.preguntas);
    if (!preguntas.length) return null;

    const totalPuntos = preguntas.reduce(
      (sum, p) => sum + Number(p.puntos_max ?? 0),
      0
    );
    const puntosObtenidos = preguntas.reduce(
      (sum, p) => sum + Number(p.puntos_obtenidos ?? 0),
      0
    );

    const correctas = preguntas.filter(
      (p) => Number(p.puntos_obtenidos ?? 0) === Number(p.puntos_max ?? 0)
    ).length;

    const parciales = preguntas.filter((p) => {
      const obt = Number(p.puntos_obtenidos ?? 0);
      const max = Number(p.puntos_max ?? 0);
      return obt > 0 && obt < max;
    }).length;

    const incorrectas = preguntas.length - correctas - parciales;

    return {
      totalPreguntas: preguntas.length,
      correctas,
      parciales,
      incorrectas,
      totalPuntos,
      puntosObtenidos,
    };
  }, [detalleIntento]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-brand-red border-t-transparent animate-spin"></div>
          </div>
          <div className="text-slate-700 font-medium">
            Cargando resultados...
          </div>
        </div>
      </div>
    );
  }

  if (error && !examenInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <div className="text-lg font-semibold text-slate-900 mb-2">Error</div>
          <div className="text-sm text-slate-600 mb-6">{error}</div>
          <Button
            variant="outline_secondary"
            onClick={() => navigate("/alumno/examenes")}
          >
            Volver a mis exámenes
          </Button>
        </div>
      </div>
    );
  }

  if (!examenInfo || intentos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline_secondary"
            onClick={() => navigate("/alumno/examenes")}
            className="inline-flex items-center gap-2 mb-6"
          >
            <ArrowLeft size={16} />
            Volver
          </Button>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <div className="text-lg font-semibold text-slate-900 mb-2">
              Sin resultados
            </div>
            <div className="text-sm text-slate-600">
              No has realizado ningún intento de este examen
            </div>
          </div>
        </div>
      </div>
    );
  }

  const intentoActual = intentos.find((i) => i.id === intentoSeleccionado);
  const califActual = Number(
    intentoActual?.calif_final ?? intentoActual?.calif_auto ?? 0
  );

  const totalPreg = estadisticas?.totalPreguntas ?? 0;
  const wCorrectas = totalPreg ? (estadisticas.correctas / totalPreg) * 100 : 0;
  const wParciales = totalPreg ? (estadisticas.parciales / totalPreg) * 100 : 0;
  const wIncorrectas = totalPreg
    ? (estadisticas.incorrectas / totalPreg) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="outline_secondary"
          onClick={() => navigate("/alumno/examenes")}
          className="inline-flex items-center gap-2 mb-6"
        >
          <ArrowLeft size={16} />
          Volver a mis exámenes
        </Button>

        {/* Header / Mejor calificación */}
        <div
          className={`rounded-2xl border-2 p-8 shadow-xl mb-6 ${getGradeBg(
            mejorCalificacion
          )}`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                {examenInfo?.tipo === "parcial"
                  ? `Parcial ${examenInfo?.parcial_id || ""}`
                  : "Examen Final"}
              </h1>
              <div className="text-sm text-slate-600">
                {formatMx(examenInfo?.fecha_inicio)} ·{" "}
                {examenInfo?.duracion_min} minutos
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy
                  size={24}
                  className={getGradeColor(mejorCalificacion)}
                />
                <span className="text-xs font-medium text-slate-600">
                  Mejor calificación
                </span>
              </div>
              <div
                className={`text-5xl font-bold ${getGradeColor(
                  mejorCalificacion
                )}`}
              >
                {mejorCalificacion.toFixed(2)}
              </div>
              <div className="text-sm font-medium text-slate-600 mt-1">
                {getGradeLabel(mejorCalificacion)}
              </div>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Intentos */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-500" />
                Tus intentos ({intentos.length})
              </h2>

              <div className="space-y-2">
                {intentos.map((i) => {
                  const calif = Number(i.calif_final ?? i.calif_auto ?? 0);
                  const isSelected = i.id === intentoSeleccionado;
                  const esMejor = calif === mejorCalificacion;

                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setIntentoSeleccionado(i.id)}
                      className={[
                        "w-full p-3 rounded-lg border-2 text-left transition-all",
                        isSelected
                          ? "border-brand-red bg-brand-red/5"
                          : "border-slate-200 hover:border-slate-300 bg-white",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                            Intento {i.intento_num}
                            {esMejor && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">
                                Mejor
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatMx(i.fin_real)}
                          </div>
                        </div>
                        <div
                          className={`text-lg font-bold ${getGradeColor(
                            calif
                          )}`}
                        >
                          {calif.toFixed(2)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumen */}
            {estadisticas && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Award size={18} className="text-slate-500" />
                  Resumen
                </h2>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" />
                      Correctas
                    </span>
                    <span className="font-semibold text-green-600">
                      {estadisticas.correctas}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-amber-500" />
                      Parciales
                    </span>
                    <span className="font-semibold text-amber-600">
                      {estadisticas.parciales}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                      <XCircle size={16} className="text-red-500" />
                      Incorrectas
                    </span>
                    <span className="font-semibold text-red-600">
                      {estadisticas.incorrectas}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600">Puntos</span>
                    <span className="font-semibold text-slate-900">
                      {estadisticas.puntosObtenidos.toFixed(2)} /{" "}
                      {estadisticas.totalPuntos.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${wCorrectas}%` }}
                    />
                    <div
                      className="bg-amber-500 transition-all"
                      style={{ width: `${wParciales}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${wIncorrectas}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Calificación del intento seleccionado */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">
                    Calificación del intento
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    Intento {intentoActual?.intento_num}
                  </div>
                </div>
                <div
                  className={`text-2xl font-bold ${getGradeColor(califActual)}`}
                >
                  {califActual.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Finalizado:{" "}
                <span className="font-medium text-slate-700">
                  {formatMx(intentoActual?.fin_real)}
                </span>
              </div>
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Eye size={18} className="text-slate-500" />
                Detalle del intento {intentoActual?.intento_num}
              </h2>

              {loadingDetalle ? (
                <div className="text-center py-10 text-slate-500">
                  <Clock size={32} className="mx-auto mb-2 text-slate-300" />
                  <div>Cargando detalle...</div>
                </div>
              ) : !detalleIntento ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="text-sm font-semibold text-slate-800">
                    No se pudo cargar el detalle
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Intenta seleccionar el intento de nuevo o recargar.
                  </div>
                </div>
              ) : safeArray(detalleIntento?.preguntas).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="text-sm font-semibold text-slate-800">
                    Sin preguntas
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Este intento no tiene preguntas registradas.
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {safeArray(detalleIntento.preguntas).map((p, idx) => {
                    const puntosObt = Number(p.puntos_obtenidos ?? 0);
                    const puntosMax = Number(p.puntos_max ?? 1);
                    const porcentaje =
                      puntosMax > 0 ? (puntosObt / puntosMax) * 100 : 0;

                    let statusColor = "bg-red-50 border-red-200";
                    let statusIcon = (
                      <XCircle size={16} className="text-red-600" />
                    );
                    let statusText = "Incorrecta";
                    let scoreColor = "text-red-600";

                    if (porcentaje === 100) {
                      statusColor = "bg-green-50 border-green-200";
                      statusIcon = (
                        <CheckCircle size={16} className="text-green-600" />
                      );
                      statusText = "Correcta";
                      scoreColor = "text-green-600";
                    } else if (porcentaje > 0) {
                      statusColor = "bg-amber-50 border-amber-200";
                      statusIcon = (
                        <div className="w-4 h-4 rounded-full bg-amber-500" />
                      );
                      statusText = "Parcial";
                      scoreColor = "text-amber-600";
                    }

                    const contenidoObj = safeJsonParse(p.contenido, p.contenido);
                    const ordenObj = safeJsonParse(p.opciones_orden_json, null);

                    let contenidoOrdenado = contenidoObj;
                    try {
                      contenidoOrdenado = ordenObj
                        ? applyOrdenToContenido(p.tipo, contenidoObj, ordenObj)
                        : contenidoObj;
                    } catch (err) {
                      contenidoOrdenado = contenidoObj;
                    }

                    // Respuesta del alumno (JSON string -> object)
                    const respuestaAlumno = safeJsonParse(
                      p.respuesta_alumno,
                      null
                    );

                    return (
                      <div
                        key={p.pregunta_version_id || idx}
                        className={`rounded-2xl border p-5 ${statusColor}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 shrink-0">{statusIcon}</div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">
                                Pregunta {idx + 1}{" "}
                                <span className="text-xs font-medium text-slate-500">
                                  · {statusText}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
                                {p.enunciado}
                              </div>

                              {!!p.estado_revision && (
                                <div className="mt-2 text-xs text-slate-500">
                                  Revisión:{" "}
                                  <span className="font-medium text-slate-700">
                                    {String(p.estado_revision)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`text-lg font-bold ${scoreColor}`}>
                              {puntosObt.toFixed(2)}
                            </div>
                            <div className="text-xs text-slate-500">
                              / {puntosMax.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                          <PreguntaRenderer
                            tipo={p.tipo}
                            contenido={contenidoOrdenado}
                            respuesta={respuestaAlumno}
                            disabled
                            onChange={() => {}}
                          />
                        </div>

                        {p.feedback && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold text-slate-600 mb-1">
                              Feedback
                            </div>
                            <div className="text-sm text-slate-800 whitespace-pre-wrap">
                              {p.feedback}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer helper */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Si ves algo raro en el orden de opciones, revisa que el backend esté
          enviando <span className="font-medium">opciones_orden_json</span> por
          pregunta.
        </div>
      </div>
    </div>
  );
}
