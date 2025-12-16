// src/components/banco/ModalVerRespuestas.jsx
import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import api from '../../api/axios';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === 'object' && 'response' in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function parseMaybeJson(v) {
  if (!v) return null;
  if (typeof v === 'object') return v; // ya viene parseado
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return null;
}

const TIPO_LABEL = {
  opcion_multiple: 'Opción múltiple',
  verdadero_falso: 'Verdadero / Falso',
  abierta: 'Abierta',
  completar: 'Completar',
  relacionar: 'Relacionar',
  ordenar: 'Ordenar',
  numerica: 'Numérica',
};

const SCOPE_LABEL = {
  parcial: 'Parcial',
  final: 'Final',
};

export default function ModalVerRespuestas({ open, onClose, preguntaId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pregunta, setPregunta] = useState(null);
  const [versionActual, setVersionActual] = useState(null);
  const [areas, setAreas] = useState([]);
  const [temas, setTemas] = useState([]);
  const [votos, setVotos] = useState([]);

  useEffect(() => {
    if (open && preguntaId) loadPregunta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preguntaId]);

  async function loadPregunta() {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get(`/api/banco/pregunta/${preguntaId}`);
      const resp = unwrapResponse(data);

      if (resp) {
        setPregunta(resp.pregunta || null);
        setVersionActual(resp.version_actual || null);
        setAreas(resp.areas || []);
        setTemas(resp.temas || []);
        setVotos(resp.votos || []);
      }
    } catch (err) {
      const msg = err?.response?.data?.response || 'Error al cargar pregunta';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const contenido = useMemo(
    () => parseMaybeJson(versionActual?.contenido_json) || {},
    [versionActual]
  );
  const respuesta = useMemo(
    () => parseMaybeJson(versionActual?.respuesta_json) || {},
    [versionActual]
  );

  const badge = (value) => {
    const v = String(value ?? '').toLowerCase();
    const cls =
      v === 'aprobada'
        ? 'bg-emerald-100 text-emerald-800'
        : v === 'rechazada'
        ? 'bg-rose-100 text-rose-800'
        : v === 'revision'
        ? 'bg-amber-100 text-amber-800'
        : v === 'pendiente'
        ? 'bg-sky-100 text-sky-800'
        : 'bg-slate-100 text-slate-800';

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
        {value ?? '—'}
      </span>
    );
  };

  const getVotoIcon = (decision) => {
    if (decision === 'aprobar') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    if (decision === 'rechazar') return <XCircle className="h-4 w-4 text-rose-600" />;
    if (decision === 'revision') return <Clock className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const handleClose = () => {
    setPregunta(null);
    setVersionActual(null);
    setAreas([]);
    setTemas([]);
    setVotos([]);
    setError('');
    onClose?.();
  };

  const AnswerCard = ({ title, children }) => (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );

  const renderRespuestas = () => {
    const tipo = String(versionActual?.tipo || '').toLowerCase();

    if (!tipo) {
      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          No se pudo identificar el tipo de pregunta.
        </div>
      );
    }

    // ====== Opción múltiple ======
    if (tipo === 'opcion_multiple') {
      const opciones = safeArray(contenido?.opciones).map((x) => String(x ?? '').trim());
      const correctasIdx = safeArray(respuesta?.correcta).map((n) => Number(n)).filter((n) => Number.isFinite(n));
      const correctasText = correctasIdx
        .map((i) => opciones?.[i])
        .filter(Boolean);

      const multiple = !!contenido?.multiple;

      return (
        <AnswerCard title="Respuestas">
          <div className="text-sm text-slate-800">
            <div className="mb-2">
              <span className="font-medium">Respuesta{multiple ? 's' : ''} correcta{multiple ? 's' : ''}:</span>{' '}
              {correctasText.length ? correctasText.join(', ') : '—'}
            </div>

            <div className="mt-2 space-y-2">
              {opciones.length ? (
                opciones.map((opt, idx) => {
                  const isCorrect = correctasIdx.includes(idx);
                  return (
                    <div
                      key={idx}
                      className={[
                        'flex items-start gap-2 rounded-md border px-3 py-2',
                        isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white',
                      ].join(' ')}
                    >
                      <div className="mt-0.5">
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-800">{opt || `Opción ${idx + 1}`}</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-600">Sin opciones registradas.</div>
              )}
            </div>
          </div>
        </AnswerCard>
      );
    }

    // ====== Verdadero / Falso ======
    if (tipo === 'verdadero_falso') {
      const correcta = !!respuesta?.correcta;
      const enunciadoCorto = String(contenido?.enunciado_corto ?? '').trim();

      return (
        <AnswerCard title="Respuesta">
          {enunciadoCorto ? (
            <div className="mb-2 text-sm text-slate-700">
              <span className="font-medium">Pista:</span> {enunciadoCorto}
            </div>
          ) : null}

          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Correcta: <span className="font-semibold">{correcta ? 'Verdadero' : 'Falso'}</span>
          </div>
        </AnswerCard>
      );
    }

    // ====== Completar ======
    if (tipo === 'completar') {
      const blanks = safeArray(contenido?.blanks);
      const resBlanks = safeArray(respuesta?.blanks);
      const map = new Map(resBlanks.map((b) => [Number(b?.id), String(b?.valor ?? '').trim()]));

      return (
        <AnswerCard title="Respuestas correctas">
          {blanks.length ? (
            <div className="space-y-2">
              {blanks.map((b, idx) => {
                const id = Number(b?.id ?? idx + 1);
                const placeholder = String(b?.placeholder ?? '___');
                const valor = map.get(id) ?? '—';

                return (
                  <div key={id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="text-xs text-slate-500">Espacio {idx + 1} ({placeholder})</div>
                    <div className="text-sm font-medium text-slate-900">{valor || '—'}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-600">Sin espacios en blanco registrados.</div>
          )}
        </AnswerCard>
      );
    }

    // ====== Relacionar ======
    if (tipo === 'relacionar') {
      const pares = safeArray(contenido?.pares);
      const correctas = safeArray(respuesta?.correctas);
      const map = new Map(correctas.map((c) => [String(c?.izq ?? '').trim(), String(c?.der ?? '').trim()]));

      return (
        <AnswerCard title="Relaciones correctas">
          {pares.length ? (
            <div className="space-y-2">
              {pares.map((p, idx) => {
                const izq = String(p?.izq ?? '').trim() || `Elemento ${idx + 1}`;
                const correcta = map.get(izq) || '—';
                const opciones = safeArray(p?.der).map((x) => String(x ?? '').trim()).filter(Boolean);

                return (
                  <div key={idx} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="text-sm text-slate-800">
                      <span className="font-semibold">{izq}</span>
                      <span className="text-slate-500"> → </span>
                      <span className="font-semibold text-emerald-700">{correcta}</span>
                    </div>

                    {opciones.length > 0 && (
                      <div className="mt-2 text-xs text-slate-600">
                        Opciones posibles: {opciones.join(' · ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-600">Sin relaciones registradas.</div>
          )}
        </AnswerCard>
      );
    }

    // ====== Ordenar ======
    if (tipo === 'ordenar') {
      const items = safeArray(contenido?.items).map((x) => String(x ?? '').trim()).filter(Boolean);
      const orden = safeArray(respuesta?.orden).map((n) => Number(n)).filter((n) => Number.isFinite(n));

      const orderedItems = orden.length
        ? orden.map((i) => items[i]).filter(Boolean)
        : items;

      return (
        <AnswerCard title="Orden correcto">
          {orderedItems.length ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
              {orderedItems.map((it, idx) => (
                <li key={idx}>{it}</li>
              ))}
            </ol>
          ) : (
            <div className="text-sm text-slate-600">Sin items registrados.</div>
          )}
        </AnswerCard>
      );
    }

    // ====== Numérica ======
    if (tipo === 'numerica') {
      const unidad = String(contenido?.unidad ?? '').trim();
      const valor = respuesta?.valor;
      const tolerancia = respuesta?.tolerancia;

      return (
        <AnswerCard title="Respuesta numérica">
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-800 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Valor correcto</div>
              <div className="font-semibold">
                {valor ?? '—'}{unidad ? ` ${unidad}` : ''}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Tolerancia</div>
              <div className="font-semibold">{tolerancia ?? '—'}</div>
            </div>
          </div>
        </AnswerCard>
      );
    }

    // ====== Abierta ======
    if (tipo === 'abierta') {
      const rubrica = safeArray(contenido?.rubrica).map((x) => String(x ?? '').trim()).filter(Boolean);
      const keywords = safeArray(respuesta?.keywords ?? contenido?.keywords).map((x) => String(x ?? '').trim()).filter(Boolean);
      const minHits = respuesta?.min_hits;

      return (
        <AnswerCard title="Guía de evaluación (pregunta abierta)">
          <div className="space-y-3">
            {rubrica.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1">Criterios (rúbrica)</div>
                <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                  {rubrica.map((r, idx) => <li key={idx}>{r}</li>)}
                </ul>
              </div>
            )}

            {keywords.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1">Palabras clave sugeridas</div>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((k, idx) => (
                    <span key={idx} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {k}
                    </span>
                  ))}
                </div>
                {minHits != null && (
                  <div className="mt-1 text-xs text-slate-600">
                    Mínimo recomendado de coincidencias: <span className="font-semibold">{minHits}</span>
                  </div>
                )}
              </div>
            )}

            {rubrica.length === 0 && keywords.length === 0 && (
              <div className="text-sm text-slate-600">
                No hay guía de evaluación registrada para esta pregunta.
              </div>
            )}
          </div>
        </AnswerCard>
      );
    }

    // Fallback
    return (
      <AnswerCard title="Respuestas">
        <div className="text-sm text-slate-700">
          Este tipo de pregunta no tiene un formato de respuestas configurado para mostrarse aquí.
        </div>
      </AnswerCard>
    );
  };

  return (
    <Modal
      open={open}
      title="Detalles de la pregunta"
      onClose={handleClose}
      size="lg"
      scrollable
      footer={
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : pregunta && versionActual ? (
        <div className="space-y-4">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Estado actual</span>
            {badge(pregunta.estado)}
          </div>

          {/* Enunciado */}
          <div>
            <div className="text-xs font-medium text-slate-600 mb-1">Enunciado</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
              {versionActual.enunciado}
            </div>
          </div>

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Tipo</div>
              <div className="text-sm text-slate-800">
                {TIPO_LABEL[String(versionActual.tipo || '').toLowerCase()] || versionActual.tipo}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Dificultad</div>
              <div className="text-sm text-slate-800">{versionActual.dificultad}/10</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Alcance</div>
              <div className="text-sm text-slate-800">
                {SCOPE_LABEL[String(versionActual.scope || '').toLowerCase()] || versionActual.scope}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Parcial</div>
              <div className="text-sm text-slate-800">{versionActual.parcial_id || '—'}</div>
            </div>
          </div>

          {/* Respuestas (UI friendly) */}
          {renderRespuestas()}

          {/* Temas */}
          {temas.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-600 mb-2">Temas relacionados</div>
              <div className="flex flex-wrap gap-2">
                {temas.map(tema => (
                  <span
                    key={tema.id}
                    className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800"
                  >
                    {tema.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Áreas */}
          {areas.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-600 mb-2">Áreas asignadas</div>
              <div className="flex flex-wrap gap-2">
                {areas.map((area, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
                  >
                    Área #{area.area_id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Votos */}
          {votos.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-600 mb-2">Historial de votos</div>
              <div className="space-y-2">
                {votos.map(voto => (
                  <div
                    key={voto.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getVotoIcon(voto.decision)}
                      <span className="text-xs font-medium text-slate-900">
                        {voto.decision === 'aprobar' ? 'Aprobado' : voto.decision === 'rechazar' ? 'Rechazado' : 'En revisión'}
                      </span>
                      <span className="text-xs text-slate-500">
                        · {voto.area_id ? `Área #${voto.area_id}` : 'Admin'}
                      </span>
                    </div>
                    {voto.comentario && (
                      <p className="text-xs text-slate-600 mt-1">{voto.comentario}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-sm text-slate-500 py-8">
          No se encontró información de la pregunta
        </div>
      )}
    </Modal>
  );
}
