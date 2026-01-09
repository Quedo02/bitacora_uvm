// src/utils/bitacoraImport.js
import * as XLSX from "xlsx";

const norm = (v) => String(v ?? "").trim();
const lower = (v) => norm(v).toLowerCase();

function toNumberOrNull(v) {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;

    const s = String(v).trim();
    if (!s) return null;

    // soporta "7/10" si alguna vez llega así
    const frac = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (frac) {
        const a = Number(frac[1]);
        const b = Number(frac[2]);
        if (Number.isFinite(a) && Number.isFinite(b) && b > 0) return (a / b) * b; // conserva "a" como score
    }

    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function readFirstSheetAsRows(file, { headerRow = 1 } = {}) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error("No pude leer el archivo."));
        fr.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
            resolve({ sheetName, rows, headerRow });
        };
        fr.readAsArrayBuffer(file);
    });
}

export function studentKeyFromEmailOrMatricula({ email, matricula, username } = {}) {
    const m = norm(matricula || username);
    if (m) return m;

    const e = lower(email);
    if (!e) return "";
    const at = e.indexOf("@");
    return at > 0 ? e.slice(0, at) : e;
}

export function deriveEmailVariantsFromMatricula(matricula) {
    const m = norm(matricula);
    if (!m) return { primary: "", alternatives: [] };
    return {
        primary: `${m}@uvm.edu.mx`,
        alternatives: [`${m}@uvm.edu`],
    };
}

// ======================
// Blackboard
// ======================
export async function parseBlackboardXlsx(file) {
    const { rows } = await readFirstSheetAsRows(file);
    if (!rows?.length) throw new Error("El archivo viene vacío.");

    const header = (rows[0] || []).map((h) => norm(h));
    const idx = {};
    header.forEach((h, i) => (idx[lower(h)] = i));

    // Blackboard base columns típicas
    const baseCols = new Set([
        "apellidos",
        "nombre",
        "nombre de usuario",
        "id de estudiante",
        "último acceso",
        "ultimo acceso",
        "disponibilidad",
    ]);

    const activityCols = header
        .map((h, i) => ({ h, i }))
        .filter(({ h }) => h && !baseCols.has(lower(h)))
        .filter(({ h }) => !["total", "promedio", "calificación total", "calificacion total"].includes(lower(h)));

    const colUsername = idx["nombre de usuario"];
    if (colUsername == null) {
        throw new Error("No encontré la columna 'Nombre de usuario' (Blackboard).");
    }

    const colNombre = idx["nombre"];
    const colApellidos = idx["apellidos"];

    const actividades = activityCols.map(({ h, i }) => ({
        key: h, // usamos el header como identificador
        nombre: h,
        colIndex: i,
        nonNullCount: 0,
    }));

    const alumnos = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;

        const username = norm(row[colUsername]);
        if (!username) continue;

        const nombre = norm(row[colNombre]);
        const apellidos = norm(row[colApellidos]);
        const { primary, alternatives } = deriveEmailVariantsFromMatricula(username);

        const calificaciones = {};
        actividades.forEach((a) => {
            const v = toNumberOrNull(row[a.colIndex]);
            if (v != null) {
                a.nonNullCount += 1;
                calificaciones[a.key] = v; // Blackboard ya viene base 10 (según tu regla)
            }
        });

        alumnos.push({
            matricula: username,
            email: primary,
            email_alt: alternatives,
            nombreCompleto: [nombre, apellidos].filter(Boolean).join(" ").trim(),
            calificaciones, // { [actividadHeader]: califBase10 }
        });
    }

    return {
        fuente: "blackboard",
        tipo: "blackboard",
        fileName: file?.name || "",
        actividades: actividades
            .map(({ key, nombre, nonNullCount }) => ({ key, nombre, nonNullCount }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        alumnos,
    };
}

// ======================
// Teams (Evaluación Continua)
// ======================
export async function parseTeamsXlsx(file) {
    const { rows } = await readFirstSheetAsRows(file);
    if (!rows?.length) throw new Error("El archivo viene vacío.");

    const header = (rows[0] || []).map((h) => norm(h));
    const idx = {};
    header.forEach((h, i) => (idx[lower(h)] = i));

    const colEmail =
        idx["dirección de correo electrónico"] ??
        idx["direccion de correo electronico"] ??
        idx["email"] ??
        idx["correo"] ??
        idx["correo electrónico"] ??
        idx["correo electronico"];

    if (colEmail == null) {
        throw new Error("No encontré la columna de correo (Teams).");
    }

    const known = new Set([
        "nombre",
        "apellidos",
        "dirección de correo electrónico",
        "direccion de correo electronico",
        "puntos",
        "comentarios",
    ]);

    // la columna de la actividad suele ser la única “no conocida”
    const activityCandidates = header
        .map((h, i) => ({ h, i, lh: lower(h) }))
        .filter(({ h, lh }) => h && !known.has(lh));

    if (activityCandidates.length === 0) {
        throw new Error("No pude detectar la columna de la actividad (Teams).");
    }

    // si hay varias, tomamos la primera por ahora
    const activityCol = activityCandidates[0];
    const colPuntos = idx["puntos"];

    let maxPoints = null;
    if (colPuntos != null) {
        for (let r = 1; r < rows.length; r++) {
            const v = toNumberOrNull(rows[r]?.[colPuntos]);
            if (v != null && v > 0) {
                maxPoints = v;
                break;
            }
        }
    }

    const alumnos = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;

        const email = norm(row[colEmail]);
        if (!email) continue;

        const local = studentKeyFromEmailOrMatricula({ email });
        const score = toNumberOrNull(row[activityCol.i]);
        const points = colPuntos != null ? toNumberOrNull(row[colPuntos]) : null;
        const denom = (points != null && points > 0) ? points : (maxPoints != null ? maxPoints : null);

        let calificacion10 = null;
        if (score != null) {
            // Teams usualmente viene como puntos obtenidos sobre "Puntos"
            if (denom != null && denom > 0) calificacion10 = (score / denom) * 10;
            else calificacion10 = score; // fallback (si ya viniera en base 10)
        }

        alumnos.push({
            email,
            matricula: local,
            calificacion10,
        });
    }

    return {
        fuente: "teams",
        tipo: "continua",
        fileName: file?.name || "",
        actividad: {
            key: activityCol.h,
            nombre: activityCol.h,
            maxPoints: maxPoints,
        },
        alumnos,
    };
}

// ======================
// Pesos
// ======================
export function normalizeWeightsTo100(weightsByKey, keys) {
    const safeKeys = (keys || []).filter(Boolean);
    const sum = safeKeys.reduce((acc, k) => acc + (Number(weightsByKey[k]) || 0), 0);

    if (sum <= 0) return { normalized: { ...weightsByKey }, sum: 0 };

    const normalized = { ...weightsByKey };
    safeKeys.forEach((k) => {
        const v = Number(weightsByKey[k]) || 0;
        normalized[k] = (v / sum) * 100;
    });

    return { normalized, sum };
}
