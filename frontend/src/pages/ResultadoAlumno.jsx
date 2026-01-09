// src/pages/ResultadoAlumno.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import RespuestaRenderer from "../components/examenes/RespuestaRenderer";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Eye,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

// Importar utilidades compartidas
import {
  unwrapResponse,
  safeArray,
  formatMx,
  getGradeColor,
  getGradeBg,
  getGradeLabel,
  calcularEstadisticas,
  getPorcentajeAcierto,
  tipoLabel,
} from "../utils/examenUtils";

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

  // Estado para controlar qué preguntas están expandidas
  const [preguntasExpandidas, setPreguntasExpandidas] = useState({});

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
        const data = unwrapResponse(res.data);
        console.log("Detalle del intento:", data); // Debug
        setDetalleIntento(data);
      } catch (e) {
        console.error("Error al cargar detalle:", e);
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
    return calcularEstadisticas(detalleIntento?.preguntas);
  }, [detalleIntento]);

  const intentoActual = useMemo(() => {
    return intentos.find((i) => i.id === intentoSeleccionado);
  }, [intentos, intentoSeleccionado]);

  const califActual = useMemo(() => {
    return Number(
      intentoActual?.calif_final ?? intentoActual?.calif_auto ?? 0
    );
  }, [intentoActual]);

  const togglePreguntaExpandida = (preguntaId) => {
    setPreguntasExpandidas((prev) => ({
      ...prev,
      [preguntaId]: !prev[preguntaId],
    }));
  };

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

  if (!intentos.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <Trophy size={64} className="mx-auto mb-4 text-slate-300" />
          <div className="text-lg font-semibold text-slate-900 mb-2">
            Sin intentos
          </div>
          <div className="text-sm text-slate-600 mb-6">
            Aún no has realizado este examen
          </div>
          <Button variant="primary" onClick={() => navigate(`/alumno/examen/${examenId}`)}>
            Iniciar examen
          </Button>
        </div>
      </div>
    );
  }

  // Calcular width de barras de progreso
  const wCorrectas = estadisticas
    ? (estadisticas.correctas / estadisticas.totalPreguntas) * 100
    : 0;
  const wParciales = estadisticas
    ? (estadisticas.parciales / estadisticas.totalPreguntas) * 100
    : 0;
  const wIncorrectas = estadisticas
    ? (estadisticas.incorrectas / estadisticas.totalPreguntas) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header con información del examen */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline_secondary"
              onClick={() => navigate("/alumno/examenes")}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Volver
            </Button>

            <div className="text-right">
              <div className="text-xs text-slate-500">
                {examenInfo?.tipo === "parcial"
                  ? `Parcial ${examenInfo.parcial_id}`
                  : "Final"}
              </div>
              <div className="text-sm font-medium text-slate-900">
                Examen #{examenInfo?.id}
              </div>
            </div>
          </div>

          {/* Calificación destacada */}
          <div
            className={`rounded-2xl border p-8 mb-6 text-center ${getGradeBg(
              mejorCalificacion
            )}`}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Trophy size={32} className={getGradeColor(mejorCalificacion)} />
              <div className={`text-5xl font-bold ${getGradeColor(mejorCalificacion)}`}>
                {mejorCalificacion.toFixed(2)}
              </div>
            </div>
            <div className="text-lg font-semibold text-slate-900 mb-1">
              {getGradeLabel(mejorCalificacion)}
            </div>
            <div className="text-sm text-slate-600">
              Tu mejor calificación
            </div>
          </div>

          {/* Selector de intentos */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Selecciona un intento para ver el detalle:
            </label>
            <select
              value={intentoSeleccionado || ""}
              onChange={(e) => setIntentoSeleccionado(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
            >
              {intentos.map((int) => {
                const calif = Number(int.calif_final ?? int.calif_auto ?? 0);
                return (
                  <option key={int.id} value={int.id}>
                    Intento {int.intento_num} - {calif.toFixed(2)} -{" "}
                    {formatMx(int.fin_real)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Detalle del intento seleccionado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar con estadísticas */}
          <div className="lg:col-span-1 space-y-4">
            {/* Estadísticas */}
            {estadisticas && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  Estadísticas
                </h3>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-sm text-slate-600">Correctas</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {estadisticas.correctas}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-amber-500" />
                      <span className="text-sm text-slate-600">Parciales</span>
                    </div>
                    <span className="font-semibold text-amber-600">
                      {estadisticas.parciales}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-red-600" />
                      <span className="text-sm text-slate-600">Incorrectas</span>
                    </div>
                    <span className="font-semibold text-red-600">
                      {estadisticas.incorrectas}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-500">
                      Puntos obtenidos
                    </span>
                    <div className="mt-1">
                      <span className="font-semibold text-slate-900">
                        {estadisticas.puntosObtenidos.toFixed(2)} /{" "}
                        {estadisticas.totalPuntos.toFixed(2)}
                      </span>
                    </div>
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
              <div className="flex items-center justify-between mb-2">
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

          {/* Panel de detalle */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Eye size={18} className="text-slate-500" />
                Detalle del intento {intentoActual?.intento_num}
              </h2>

              {loadingDetalle ? (
                <div className="text-center py-10 text-slate-500">
                  <Clock size={32} className="mx-auto mb-2 text-slate-300 animate-spin" />
                  <div>Cargando detalle...</div>
                </div>
              ) : !detalleIntento ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <AlertCircle size={32} className="mx-auto mb-2 text-slate-400" />
                  <div className="text-sm font-semibold text-slate-800">
                    No se pudo cargar el detalle
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Intenta seleccionar el intento de nuevo o recargar.
                  </div>
                </div>
              ) : safeArray(detalleIntento?.preguntas).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <AlertCircle size={32} className="mx-auto mb-2 text-slate-400" />
                  <div className="text-sm font-semibold text-slate-800">
                    Sin preguntas
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Este intento no tiene preguntas registradas.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {safeArray(detalleIntento.preguntas).map((p, idx) => {
                    const puntosObt = Number(p.puntos_obtenidos ?? 0);
                    const puntosMax = Number(p.puntos_max ?? 1);
                    const porcentaje = getPorcentajeAcierto(puntosObt, puntosMax);

                    let statusColor = "border-red-200 bg-red-50";
                    let statusIcon = (
                      <XCircle size={16} className="text-red-600" />
                    );
                    let statusText = "Incorrecta";
                    let scoreColor = "text-red-600";

                    if (porcentaje === 100) {
                      statusColor = "border-green-200 bg-green-50";
                      statusIcon = (
                        <CheckCircle size={16} className="text-green-600" />
                      );
                      statusText = "Correcta";
                      scoreColor = "text-green-600";
                    } else if (porcentaje > 0) {
                      statusColor = "border-amber-200 bg-amber-50";
                      statusIcon = (
                        <div className="w-4 h-4 rounded-full bg-amber-500" />
                      );
                      statusText = "Parcial";
                      scoreColor = "text-amber-600";
                    }

                    const preguntaId = p.pregunta_version_id || idx;
                    const estaExpandida = preguntasExpandidas[preguntaId];

                    return (
                      <div
                        key={preguntaId}
                        className={`rounded-xl border p-4 ${statusColor} transition-colors`}
                      >
                        {/* Header clickeable */}
                        <button
                          onClick={() => togglePreguntaExpandida(preguntaId)}
                          className="w-full flex items-start justify-between gap-4 text-left"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="mt-0.5 shrink-0">{statusIcon}</div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-900">
                                Pregunta {idx + 1}{" "}
                                <span className="text-xs font-medium text-slate-500">
                                  · {statusText}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                {tipoLabel(p.tipo)}
                              </div>
                              <div className="mt-1 text-sm text-slate-800 line-clamp-2">
                                {p.enunciado}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className={`text-lg font-bold ${scoreColor}`}>
                                {puntosObt.toFixed(2)}
                              </div>
                              <div className="text-xs text-slate-500">
                                / {puntosMax.toFixed(2)}
                              </div>
                            </div>
                            <ChevronDown
                              size={20}
                              className={`text-slate-400 transition-transform ${
                                estaExpandida ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </button>

                        {/* Detalle expandible */}
                        {estaExpandida && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="mb-3 text-sm font-medium text-slate-700">
                              {p.enunciado}
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <RespuestaRenderer
                                tipo={p.tipo}
                                respuesta={p.respuesta_alumno}
                                contenido={p.contenido}
                                respuestaCorrecta={p.respuesta_correcta}
                                respuestaTexto={p.respuesta_texto}
                                mostrarCorrectas={false}
                                esVistaDocente={false}
                              />
                            </div>

                            {p.feedback && (
                              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                                <div className="text-xs font-semibold text-blue-700 mb-1">
                                  Comentario del docente:
                                </div>
                                <div className="text-sm text-blue-900 whitespace-pre-wrap">
                                  {p.feedback}
                                </div>
                              </div>
                            )}
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
      </div>
    </div>
  );
}