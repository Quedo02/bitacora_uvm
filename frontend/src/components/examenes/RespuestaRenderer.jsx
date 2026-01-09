// src/components/examenes/RespuestaRenderer.jsx
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { safeArray, safeJsonParse } from "../../utils/examenUtils";

/**
 * Componente para renderizar respuestas del alumno con indicadores visuales
 * Muestra: respuesta del alumno, respuesta correcta, y estado (correcto/incorrecto/parcial)
 * 
 * @param {string} tipo - Tipo de pregunta
 * @param {string|object} respuesta - Respuesta del alumno (JSON)
 * @param {string|object} contenido - Contenido de la pregunta (JSON)
 * @param {string|object} respuestaCorrecta - Respuesta correcta (JSON)
 * @param {string|object} respuestaTexto - Texto de respuesta para preguntas abiertas
 * @param {boolean} mostrarCorrectas - Si mostrar las respuestas correctas (solo docentes/coordinadores)
 * @param {boolean} esVistaDocente - Si es vista de docente (cambia "Tu respuesta" por "Respuesta del alumno")
 * @param {string|object} opcionesOrden - JSON con la permutación de opciones (para traducir índices)
 */
export default function RespuestaRenderer({
  tipo,
  respuesta,
  contenido,
  respuestaCorrecta,
  respuestaTexto,
  mostrarCorrectas = false,
  esVistaDocente = false,
  opcionesOrden = null,
}) {
  const t = String(tipo || "").toLowerCase();
  const resp = safeJsonParse(respuesta);
  const corr = safeJsonParse(respuestaCorrecta);
  const cont = safeJsonParse(contenido);
  const texto = respuestaTexto || resp?.texto || "";
  const perm = safeJsonParse(opcionesOrden);

  const etiquetaRespuesta = esVistaDocente ? "Respuesta del alumno" : "Tu respuesta";

  // Opción múltiple
  if (t === "opcion_multiple") {
    const opciones = safeArray(cont?.opciones);
    const seleccion = resp?.seleccion;
    const correctas = new Set(safeArray(corr?.correcta).map(Number));
    const multiple = Boolean(cont?.multiple);

    // Obtener permutación si existe
    const permOpciones = perm?.opciones || null;

    // La selección del alumno usa índices del array mezclado
    // Necesitamos traducir a índices originales para comparar con correctas
    let selSet;
    if (multiple) {
      const selArray = safeArray(seleccion).map(Number);
      if (permOpciones) {
        // Traducir: índice mezclado -> índice original
        selSet = new Set(selArray.map(idx => permOpciones[idx]).filter(x => x !== undefined));
      } else {
        selSet = new Set(selArray);
      }
    } else {
      if (seleccion !== null && seleccion !== undefined) {
        const idx = Number(seleccion);
        if (permOpciones && permOpciones[idx] !== undefined) {
          selSet = new Set([permOpciones[idx]]);
        } else {
          selSet = new Set([idx]);
        }
      } else {
        selSet = new Set();
      }
    }

    // Para mostrar, aplicamos la permutación al contenido para ver las opciones como las vio el alumno
    let opcionesMostrar = opciones;
    let indicesMostrar = opciones.map((_, i) => i);
    
    if (permOpciones) {
      // Reordenar opciones según la permutación para mostrar como las vio el alumno
      opcionesMostrar = permOpciones.map(origIdx => opciones[origIdx]).filter(x => x !== undefined);
      indicesMostrar = permOpciones;
    }

    return (
      <div className="space-y-2">
        {opcionesMostrar.map((opc, visualIdx) => {
          // índice original de esta opción
          const origIdx = permOpciones ? permOpciones[visualIdx] : visualIdx;
          
          // El alumno seleccionó esta posición visual?
          const rawSel = multiple ? safeArray(seleccion).map(Number) : (seleccion !== null && seleccion !== undefined ? [Number(seleccion)] : []);
          const isSelected = rawSel.includes(visualIdx);
          
          // Es correcta? (usando índice original)
          const isCorrect = correctas.has(origIdx);

          let bgClass = "bg-white border-slate-200";
          let icon = null;
          let label = null;

          if (isCorrect) {
            // ✅ SIEMPRE verde si es correcta
            bgClass = "bg-green-50 border-green-300";
            icon = <CheckCircle size={16} className="text-green-600" />;
            if (isSelected) {
              label = (
                <span className="text-xs font-medium text-green-600">
                  ✓ Correcta
                </span>
              );
            } else if (mostrarCorrectas) {
              label = (
                <span className="text-xs font-medium text-green-600">
                  Correcta
                </span>
              );
            }
          } else if (isSelected && !isCorrect) {
            bgClass = "bg-red-50 border-red-300";
            icon = <XCircle size={16} className="text-red-600" />;
            label = (
              <span className="text-xs font-medium text-red-600">
                ✗ Incorrecto
              </span>
            );
          }

          return (
            <div
              key={visualIdx}
              className={`flex items-start gap-3 p-3 rounded-lg border ${bgClass} transition-colors`}
            >
              <div className="mt-0.5">{icon || <div className="w-4 h-4" />}</div>
              <span className="flex-1 text-sm text-slate-800">{opc}</span>
              {label}
            </div>
          );
        })}
      </div>
    );
  }

  // Verdadero/Falso
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
          let statusBadge = null;

          if (isCorrectOption) {
            // ✅ Verde para la correcta
            bgClass = "bg-green-50 border-green-300";
            if (isSelected) {
              statusBadge = (
                <div className="text-xs font-medium text-green-600">
                  ✓ Correcto
                </div>
              );
            } else if (mostrarCorrectas) {
              statusBadge = (
                <div className="text-xs font-medium text-green-600">
                  Correcta
                </div>
              );
            }
          } else if (isSelected && !isCorrectOption) {
            bgClass = "bg-red-50 border-red-300";
            statusBadge = (
              <div className="text-xs font-medium text-red-600">
                ✗ Incorrecto
              </div>
            );
          }

          return (
            <div
              key={String(v)}
              className={`p-4 rounded-lg border text-center ${bgClass} transition-colors`}
            >
              <div className="text-lg font-bold mb-1">
                {v ? "Verdadero" : "Falso"}
              </div>
              {isSelected && (
                <div className="inline-flex items-center gap-1 mb-1">
                  {isCorrectOption ? (
                    <CheckCircle size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-red-600" />
                  )}
                  <span className="text-xs text-slate-600">{etiquetaRespuesta}</span>
                </div>
              )}
              {statusBadge}
            </div>
          );
        })}
      </div>
    );
  }

  // Respuesta abierta
  if (t === "abierta") {
    const keywords = safeArray(corr?.keywords);

    return (
      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-2">
            {etiquetaRespuesta}:
          </div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap">
            {texto || (
              <em className="text-slate-400">Sin respuesta</em>
            )}
          </div>
        </div>

        {mostrarCorrectas && keywords.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs font-medium text-blue-700 mb-2">
              Palabras clave esperadas:
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, i) => {
                const found = texto.toLowerCase().includes(kw.toLowerCase());
                return (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      found
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {kw} {found && "✓"}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {!mostrarCorrectas && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
                Esta pregunta requiere revisión manual del docente
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Numérica
  if (t === "numerica") {
    const valor = resp?.valor;
    const correcto = corr?.valor;
    const tolerancia = corr?.tolerancia || 0;

    const numValor = Number(valor);
    const numCorrecto = Number(correcto);
    const isCorrect = Math.abs(numValor - numCorrecto) <= tolerancia;

    return (
      <div className="space-y-3">
        <div
          className={`p-4 rounded-lg border ${
            isCorrect
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div className="text-xs font-medium text-slate-500 mb-1">
            {etiquetaRespuesta}:
          </div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {valor || "-"}
            {isCorrect ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : (
              <XCircle size={20} className="text-red-600" />
            )}
          </div>
        </div>

        {mostrarCorrectas && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-300">
            <div className="text-xs font-medium text-green-700 mb-1">
              Respuesta correcta:
            </div>
            <div className="text-xl font-bold text-green-900">
              {correcto}
              {tolerancia > 0 && (
                <span className="text-sm font-normal text-green-700 ml-2">
                  (±{tolerancia})
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Completar
  if (t === "completar") {
    const respuestas = {};
    const blanksArray = safeArray(resp?.blanks);
    blanksArray.forEach(b => {
      const id = String(b?.id ?? b?.blank_id ?? b?.index);
      respuestas[id] = String(b?.valor ?? b?.value ?? "").trim();
    });

    const correctas = {};
    const correctasArray = safeArray(corr?.blanks);
    correctasArray.forEach(b => {
      const id = String(b?.id ?? b?.blank_id ?? b?.index);
      const valores = Array.isArray(b?.valor) 
        ? b.valor.map(v => String(v).trim().toLowerCase())
        : [String(b?.valor ?? "").trim().toLowerCase()];
      correctas[id] = valores;
    });

    const blanks = safeArray(cont?.blanks);

    return (
      <div className="space-y-3">
        {blanks.map((blank, idx) => {
          const id = String(blank?.id ?? idx);
          const userAns = (respuestas[id] || "").toLowerCase();
          const correctAns = correctas[id] || [];
          const isCorrect = correctAns.includes(userAns);

          return (
            <div
              key={id}
              className={`p-3 rounded-lg border ${
                isCorrect
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <div className="flex items-start gap-2">
                {isCorrect ? (
                  <CheckCircle size={16} className="text-green-600 mt-1" />
                ) : (
                  <XCircle size={16} className="text-red-600 mt-1" />
                )}
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-500">
                    Espacio {idx + 1}
                  </div>
                  <div className="text-sm font-medium text-slate-900 mt-1">
                    {etiquetaRespuesta}: <span className="font-bold">{respuestas[id] || "(vacío)"}</span>
                  </div>
                  {mostrarCorrectas && !isCorrect && (
                    <div className="text-xs text-green-700 mt-1">
                      Correcta: <span className="font-semibold">{correctas[id]?.join(" / ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Relacionar
  if (t === "relacionar") {
    const pares = safeArray(resp?.pares);
    const correctas = safeArray(corr?.correctas);

    // Crear mapa de respuestas correctas
    const correctMap = {};
    correctas.forEach((par) => {
      correctMap[String(par.izq)] = String(par.der);
    });

    // Crear mapa de respuestas del alumno
    const userMap = {};
    pares.forEach((par) => {
      userMap[String(par.izq)] = String(par.der);
    });

    const items = safeArray(cont?.izquierda);

    return (
      <div className="space-y-2">
        {items.map((item, idx) => {
          const userMatch = userMap[String(idx)];
          const correctMatch = correctMap[String(idx)];
          const isCorrect = userMatch === correctMatch;

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                isCorrect
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {isCorrect ? (
                  <CheckCircle size={16} className="text-green-600" />
                ) : (
                  <XCircle size={16} className="text-red-600" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {item}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {etiquetaRespuesta}: <span className="font-medium">{userMatch || "(sin respuesta)"}</span>
                  </div>
                  {mostrarCorrectas && !isCorrect && (
                    <div className="text-xs text-green-700 mt-1">
                      Correcta: <span className="font-medium">{correctMatch}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Ordenar
  if (t === "ordenar") {
    const orden = safeArray(resp?.orden);
    const ordenCorrecto = safeArray(corr?.orden);
    const items = safeArray(cont?.items);
    
    // Obtener permutación si existe
    const permItems = perm?.items || null;
    
    // La respuesta del alumno usa índices del array mezclado
    // Necesitamos traducir a índices originales para comparar
    let ordenTraducido = orden;
    if (permItems) {
      // Traducir: cada índice mezclado -> índice original
      ordenTraducido = orden.map(idxMezclado => permItems[idxMezclado]).filter(x => x !== undefined);
    }
    
    // Comparar con el orden correcto (que usa índices originales)
    const isCorrect = JSON.stringify(ordenTraducido) === JSON.stringify(ordenCorrecto);
    
    // Para mostrar la respuesta del alumno, usamos el contenido mezclado
    // Aplicamos la permutación al array de items para obtener el orden visual que vio el alumno
    let itemsMezclados = items;
    if (permItems) {
      itemsMezclados = permItems.map(origIdx => items[origIdx]).filter(x => x !== undefined);
    }

    return (
      <div className="space-y-4">
        <div
          className={`p-4 rounded-lg border ${
            isCorrect
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div className="flex items-start gap-2 mb-3">
            {isCorrect ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <XCircle size={18} className="text-red-600" />
            )}
            <div className="text-sm font-medium text-slate-900">
              {isCorrect ? "Orden correcto" : "Orden incorrecto"}
            </div>
          </div>

          <div className="text-xs font-medium text-slate-500 mb-2">
            {etiquetaRespuesta}:
          </div>
          <div className="space-y-1">
            {orden.map((idxMezclado, pos) => (
              <div
                key={pos}
                className="flex items-center gap-2 text-sm text-slate-800"
              >
                <span className="font-bold text-slate-500">{pos + 1}.</span>
                <span>{itemsMezclados[idxMezclado]}</span>
              </div>
            ))}
          </div>
        </div>

        {mostrarCorrectas && !isCorrect && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-300">
            <div className="text-xs font-medium text-green-700 mb-2">
              Orden correcto:
            </div>
            <div className="space-y-1">
              {ordenCorrecto.map((origIdx, pos) => (
                <div
                  key={pos}
                  className="flex items-center gap-2 text-sm text-green-900"
                >
                  <span className="font-bold text-green-700">{pos + 1}.</span>
                  <span>{items[origIdx]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tipo no soportado
  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
      <div className="text-sm text-slate-500">
        Tipo de pregunta no soportado: {tipo}
      </div>
      <div className="text-xs text-slate-400 mt-2">
        Respuesta: {JSON.stringify(respuesta)}
      </div>
    </div>
  );
}