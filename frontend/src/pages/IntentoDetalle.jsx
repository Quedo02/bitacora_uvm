// src/pages/IntentoDetalle.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import RespuestaRenderer from "../components/examenes/RespuestaRenderer";
import { 
  ArrowLeft, 
  Clock, 
  Save,
  FileText,
  Award,
} from "lucide-react";

import {
  unwrapResponse,
  safeArray,
  formatMx,
  badgeClass,
  tipoLabel,
  calcularEstadisticas,
  getPorcentajeAcierto,
} from "../utils/examenUtils";

export default function IntentoDetalle({ currentUser }) {
  const { intentoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [intento, setIntento] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  
  const [califManual, setCalifManual] = useState("");
  const [comentarios, setComentarios] = useState("");
  
  // ⭐ NUEVO: Estado para editar puntajes por pregunta
  const [puntajesEditados, setPuntajesEditados] = useState({});
  const [feedbacksEditados, setFeedbacksEditados] = useState({});

  const mostrarCorrectas = useMemo(() => {
    const rolId = currentUser?.rol_id;
    return [1, 2, 3, 4].includes(rolId);
  }, [currentUser]);

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

        const intentoData = data?.intento;
        if (intentoData?.calif_final) {
          setCalifManual(String(intentoData.calif_final));
        } else if (intentoData?.calif_auto) {
          setCalifManual(String(intentoData.calif_auto));
        }
        
        if (intentoData?.comentarios_docente) {
          setComentarios(intentoData.comentarios_docente);
        }
      } catch (e) {
        setError(
          e?.response?.data?.response ||
            e?.message ||
            "Error al cargar el detalle"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [intentoId]);

  const estadisticas = useMemo(() => {
    return calcularEstadisticas(preguntas);
  }, [preguntas]);

  // ⭐ NUEVO: Calcular calif_final basado en ediciones
  const { totalPuntos, puntosObtenidos, califFinalCalculada } = useMemo(() => {
    const total = preguntas.reduce(
      (sum, p) => sum + Number(p.puntos_max ?? 0),
      0
    );
    
    let obtenidos = 0;
    preguntas.forEach((p) => {
      const pvId = p.pregunta_version_id;
      
      // Usar puntaje editado si existe, si no usar el original
      if (puntajesEditados[pvId] !== undefined) {
        obtenidos += Number(puntajesEditados[pvId]);
      } else {
        obtenidos += Number(p.puntos_obtenidos ?? 0);
      }
    });
    
    return { 
      totalPuntos: total, 
      puntosObtenidos: obtenidos,
      califFinalCalculada: obtenidos 
    };
  }, [preguntas, puntajesEditados]);

  const calificar = async () => {
    // ⭐ Validar que haya comentarios
    if (!comentarios.trim()) {
      alert("Debes agregar comentarios antes de guardar la calificación");
      return;
    }

    // ⭐ Preparar ajustes por pregunta
    const ajustesPreguntas = [];
    preguntas.forEach((p) => {
      const pvId = p.pregunta_version_id;
      const puntosOrig = Number(p.puntos_obtenidos ?? 0);
      const puntosNuevo = puntajesEditados[pvId] !== undefined 
        ? Number(puntajesEditados[pvId]) 
        : null;
      
      // Solo enviar si hay cambios
      if (puntosNuevo !== null || feedbacksEditados[pvId]) {
        ajustesPreguntas.push({
          pregunta_version_id: pvId,
          puntos_manual: puntosNuevo,
          feedback: feedbacksEditados[pvId] || null
        });
      }
    });

    setSaving(true);
    try {
      const payload = {
        comentarios: comentarios.trim(),
        ajustes_preguntas: ajustesPreguntas
      };

      // Solo enviar calif_final si el usuario la editó manualmente
      if (califManual && califManual !== String(califFinalCalculada)) {
        payload.calif_final = Number(califManual);
      }

      console.log("Enviando payload:", payload);

      await api.post(`/api/examenes/intento/${intentoId}/calificar`, payload);

      alert("Calificación guardada exitosamente y registrada en bitácora");

      // Recargar datos
      const res = await api.get(`/api/examenes/intento/${intentoId}/detalle`);
      const data = unwrapResponse(res.data);
      setIntento(data?.intento);
      setPreguntas(safeArray(data?.preguntas));
      
      // Limpiar ediciones
      setPuntajesEditados({});
      setFeedbacksEditados({});
    } catch (e) {
      alert(
        e?.response?.data?.response ||
          e?.message ||
          "Error al guardar calificación"
      );
    } finally {
      setSaving(false);
    }
  };

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

  if (error || !intento) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "No se pudo cargar el intento"}
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

        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${badgeClass(
            intento.estado
          )}`}
        >
          {String(intento.estado || "-")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel lateral */}
        <div className="lg:col-span-1 space-y-4">
          {/* Calificación */}
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
                <span className="font-medium">
                  {Number(intento.calif_auto ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Calif. final</span>
                <span className="font-medium">
                  {Number(intento.calif_final ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          {estadisticas && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                Estadísticas
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Correctas</span>
                  <span className="font-medium text-green-600">
                    {estadisticas.correctas}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Parciales</span>
                  <span className="font-medium text-amber-600">
                    {estadisticas.parciales}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Incorrectas</span>
                  <span className="font-medium text-red-600">
                    {estadisticas.incorrectas}
                  </span>
                </div>
              </div>
            </div>
          )}

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
          {mostrarCorrectas && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-slate-500" />
                Calificación Final
              </h2>

              <div className="space-y-4">
                {/* Mostrar calif calculada */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1 font-medium">
                    Calificación calculada:
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {califFinalCalculada.toFixed(2)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {Object.keys(puntajesEditados).length > 0 
                      ? "(Con tus ediciones aplicadas)"
                      : "(Basada en autocalificación)"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sobrescribir calificación (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalPuntos}
                    value={califManual}
                    onChange={(e) => setCalifManual(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                    placeholder={califFinalCalculada.toFixed(2)}
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Solo llena esto si quieres usar una calificación diferente a la calculada
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Comentarios <span className="text-red-500">* Obligatorio</span>
                  </label>
                  <textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                    placeholder="Escribe observaciones generales sobre el examen..."
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={calificar}
                  disabled={saving || !comentarios.trim()}
                  className="w-full inline-flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {saving ? "Guardando..." : "Guardar y Aplicar a Bitácora"}
                </Button>
                
                {!comentarios.trim() && (
                  <div className="text-xs text-amber-600 text-center">
                    ⚠️ Los comentarios son obligatorios
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panel de preguntas */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Respuestas ({preguntas.length} preguntas)
            </h2>

            {preguntas.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                No hay preguntas registradas
              </div>
            ) : (
              <div className="space-y-6">
                {preguntas.map((p, idx) => {
                  const pvId = p.pregunta_version_id;
                  const puntosMax = Number(p.puntos_max ?? 1);
                  
                  // Usar puntaje editado o el original
                  const puntosObt = puntajesEditados[pvId] !== undefined
                    ? Number(puntajesEditados[pvId])
                    : Number(p.puntos_obtenidos ?? 0);
                  
                  const porcentaje = getPorcentajeAcierto(puntosObt, puntosMax);

                  return (
                    <div
                      key={pvId || idx}
                      className="rounded-xl border border-slate-200 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="bg-slate-50 p-4 border-b border-slate-200">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-sm font-bold">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-900 whitespace-pre-wrap">
                                {p.enunciado}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span className="px-2 py-0.5 rounded bg-slate-200">
                                  {tipoLabel(p.tipo)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Editable puntos */}
                          {mostrarCorrectas ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={puntosMax}
                                value={puntajesEditados[pvId] !== undefined ? puntajesEditados[pvId] : puntosObt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPuntajesEditados(prev => ({
                                    ...prev,
                                    [pvId]: val === '' ? 0 : Number(val)
                                  }));
                                }}
                                className={`w-20 px-2 py-1 text-center border-2 rounded text-sm font-bold
                                  ${puntajesEditados[pvId] !== undefined 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-slate-300'}`}
                                title="Editar puntaje"
                              />
                              <div className="text-sm font-medium text-slate-600">
                                / {puntosMax.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-right shrink-0">
                              <div
                                className={`text-lg font-bold ${
                                  porcentaje === 100
                                    ? "text-green-600"
                                    : porcentaje > 0
                                    ? "text-amber-600"
                                    : "text-red-600"
                                }`}
                              >
                                {puntosObt.toFixed(2)}
                              </div>
                              <div className="text-xs text-slate-500">
                                / {puntosMax.toFixed(2)} pts
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Respuesta */}
                      <div className="p-4">
                        <RespuestaRenderer
                          tipo={p.tipo}
                          respuesta={p.respuesta_alumno}
                          contenido={p.contenido}
                          respuestaCorrecta={p.respuesta_correcta}
                          respuestaTexto={p.respuesta_texto}
                          mostrarCorrectas={mostrarCorrectas}
                          esVistaDocente={true}
                          opcionesOrden={p.opciones_orden_json}
                        />
                      </div>

                      {/* Feedback editable */}
                      {mostrarCorrectas && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200">
                          <label className="block text-xs font-semibold text-slate-600 mb-2">
                            Feedback para esta pregunta (opcional):
                          </label>
                          <textarea
                            value={feedbacksEditados[pvId] !== undefined ? feedbacksEditados[pvId] : (p.feedback || '')}
                            onChange={(e) => {
                              setFeedbacksEditados(prev => ({
                                ...prev,
                                [pvId]: e.target.value
                              }));
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                            placeholder="Comentario específico sobre esta respuesta..."
                          />
                        </div>
                      )}

                      {/* Feedback existente (solo vista alumno) */}
                      {!mostrarCorrectas && p.feedback && (
                        <div className="p-4 bg-blue-50 border-t border-blue-200">
                          <div className="text-xs font-semibold text-blue-700 mb-1">
                            💬 Feedback del docente:
                          </div>
                          <div className="text-sm text-blue-900 whitespace-pre-wrap">
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
    </div>
  );
}