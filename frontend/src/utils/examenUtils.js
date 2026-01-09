// src/utils/examenUtils.js

/**
 * Utilidades compartidas para el módulo de exámenes
 */

/**
 * Desenvuelve la respuesta del API
 */
export function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "response" in data) {
    return data.response;
  }
  return data;
}

/**
 * Convierte cualquier valor en un array seguro
 */
export function safeArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.values(v);
  return [];
}

/**
 * Parsea JSON de forma segura
 */
export function safeJsonParse(v, fallback = null) {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return fallback;
  }
}

/**
 * Formatea fecha MySQL a formato mexicano
 */
export function formatMx(mysqlDt) {
  if (!mysqlDt) return "-";
  const [d, t] = String(mysqlDt).split(" ");
  if (!d) return String(mysqlDt);
  const [yyyy, mm, dd] = d.split("-");
  const hhmm = (t || "").slice(0, 5);
  return `${dd}/${mm}/${yyyy}${hhmm ? " " + hhmm : ""}`;
}

/**
 * Retorna clase CSS para badge de estado
 */
export function badgeClass(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "enviado") return "bg-blue-100 text-blue-700";
  if (e === "revisado") return "bg-green-100 text-green-700";
  if (e === "en_progreso") return "bg-amber-100 text-amber-800";
  if (e === "anulado") return "bg-red-100 text-red-700";
  if (e === "programado") return "bg-green-100 text-green-700";
  if (e === "activo") return "bg-blue-100 text-blue-700";
  if (e === "cerrado") return "bg-slate-100 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

/**
 * Retorna etiqueta amigable para tipo de pregunta
 */
export function tipoLabel(tipo) {
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

/**
 * Funciones para obtener color de calificación
 */
export function getGradeColor(grade) {
  if (grade >= 9) return "text-green-600";
  if (grade >= 7) return "text-blue-600";
  if (grade >= 6) return "text-amber-600";
  return "text-red-600";
}

export function getGradeBg(grade) {
  if (grade >= 9) return "bg-green-100 border-green-200";
  if (grade >= 7) return "bg-blue-100 border-blue-200";
  if (grade >= 6) return "bg-amber-100 border-amber-200";
  return "bg-red-100 border-red-200";
}

export function getGradeLabel(grade) {
  if (grade >= 9) return "Excelente";
  if (grade >= 8) return "Muy bien";
  if (grade >= 7) return "Bien";
  if (grade >= 6) return "Aprobado";
  return "Necesitas mejorar";
}

/**
 * Calcula estadísticas de un intento
 */
export function calcularEstadisticas(preguntas) {
  const preguntasArray = safeArray(preguntas);
  if (!preguntasArray.length) return null;

  const totalPuntos = preguntasArray.reduce(
    (sum, p) => sum + Number(p.puntos_max ?? 0),
    0
  );
  const puntosObtenidos = preguntasArray.reduce(
    (sum, p) => sum + Number(p.puntos_obtenidos ?? 0),
    0
  );

  const correctas = preguntasArray.filter(
    (p) => Number(p.puntos_obtenidos ?? 0) === Number(p.puntos_max ?? 0)
  ).length;

  const parciales = preguntasArray.filter((p) => {
    const obt = Number(p.puntos_obtenidos ?? 0);
    const max = Number(p.puntos_max ?? 0);
    return obt > 0 && obt < max;
  }).length;

  const incorrectas = preguntasArray.length - correctas - parciales;

  return {
    totalPreguntas: preguntasArray.length,
    correctas,
    parciales,
    incorrectas,
    totalPuntos,
    puntosObtenidos,
  };
}

/**
 * Verifica si una respuesta es correcta
 */
export function esRespuestaCorrecta(puntosObtenidos, puntosMax) {
  return Number(puntosObtenidos ?? 0) === Number(puntosMax ?? 0);
}

/**
 * Verifica si una respuesta es parcialmente correcta
 */
export function esRespuestaParcial(puntosObtenidos, puntosMax) {
  const obt = Number(puntosObtenidos ?? 0);
  const max = Number(puntosMax ?? 0);
  return obt > 0 && obt < max;
}

/**
 * Obtiene el porcentaje de acierto
 */
export function getPorcentajeAcierto(puntosObtenidos, puntosMax) {
  const obt = Number(puntosObtenidos ?? 0);
  const max = Number(puntosMax ?? 0);
  return max > 0 ? (obt / max) * 100 : 0;
}