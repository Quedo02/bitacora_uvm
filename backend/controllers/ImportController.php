<?php
namespace Controllers;

use Exception;
use PDO;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

/**
 * Importador "semestre" desde Excel (1 archivo con hojas o varios archivos).
 *
 * Espera multipart/form-data:
 *  - codigo_periodo (ej. 2025-C1)
 *  - fecha_inicio (YYYY-MM-DD)
 *  - fecha_fin    (YYYY-MM-DD)
 *  - area_id (opcional; si no viene se toma de coordinador_profile)
 *  - files[] (xlsx/xls)
 */
class ImportController
{
    public static function importSemestre()
    {
        try {
            self::requirePost();

            if (!class_exists(IOFactory::class)) {
                return self::json(500, [
                    'ok' => false,
                    'response' => 'Falta PhpSpreadsheet. Instala: composer require phpoffice/phpspreadsheet'
                ]);
            }

            $codigoPeriodo = trim((string)($_POST['codigo_periodo'] ?? ''));
            $fechaInicio   = trim((string)($_POST['fecha_inicio'] ?? ''));
            $fechaFin      = trim((string)($_POST['fecha_fin'] ?? ''));

            if ($codigoPeriodo === '') return self::json(400, ['ok'=>false,'response'=>'Falta codigo_periodo (ej. 2025-C1).']);
            if (!self::isDateYmd($fechaInicio)) return self::json(400, ['ok'=>false,'response'=>'fecha_inicio inválida (usa YYYY-MM-DD).']);
            if (!self::isDateYmd($fechaFin)) return self::json(400, ['ok'=>false,'response'=>'fecha_fin inválida (usa YYYY-MM-DD).']);

            $files = self::getUploadedFiles('files');
            if (count($files) === 0) return self::json(400, ['ok'=>false,'response'=>'Adjunta al menos 1 archivo Excel.']);

            $db = self::db();

            // Contexto del coordinador / area
            $userId = self::getAuthUserId();
            $areaId = (int)($_POST['area_id'] ?? 0);
            if ($areaId <= 0) {
                if ($userId <= 0) {
                    return self::json(401, ['ok'=>false,'response'=>'No pude identificar tu usuario. (Revisa AuthMiddleware/Login).']);
                }
                $areaId = self::getAreaIdFromCoordinator($db, $userId);
                if ($areaId <= 0) {
                    return self::json(403, ['ok'=>false,'response'=>'Tu usuario no tiene area asignada en coordinador_profile.']);
                }
            }

            $warnings = [];
            $data = [
                'carreras'      => [],
                'materias'      => [],
                'alumnos'       => [],
                'docentes'      => [],
                'secciones'     => [],
                'componentes'   => [],
                'inscripciones' => [],
                'temas'         => [],
            ];

            // 1) Parsear todos los excels (hojas o nombre de archivo)
            foreach ($files as $f) {
                $tmp = $f['tmp_name'];
                $name = $f['name'] ?? 'archivo.xlsx';

                $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                if (!in_array($ext, ['xlsx','xls'], true)) {
                    $warnings[] = ['file'=>$name,'msg'=>'No es .xlsx/.xls, se omitió.'];
                    continue;
                }

                $spreadsheet = IOFactory::load($tmp);
                $sheetCount = $spreadsheet->getSheetCount();

                $recognized = 0;
                for ($i=0; $i<$sheetCount; $i++) {
                    $ws = $spreadsheet->getSheet($i);
                    $title = (string)$ws->getTitle();

                    $type = self::detectSheetType($title);
                    if (!$type) continue;

                    $rows = self::readWorksheet($ws, $type, $warnings, $name, $title);
                    foreach ($rows as $r) $data[$type][] = $r;
                    $recognized++;
                }

                // Si no reconoció hojas, intenta por nombre de archivo (Alumnos.xlsx, Materias.xls, etc.)
                if ($recognized === 0) {
                    $type = self::detectSheetType($name);
                    if ($type) {
                        $ws = $spreadsheet->getSheet(0);
                        $rows = self::readWorksheet($ws, $type, $warnings, $name, (string)$ws->getTitle());
                        foreach ($rows as $r) $data[$type][] = $r;
                    } else {
                        $warnings[] = ['file'=>$name,'msg'=>'No detecté hojas válidas (Carreras, Materias, Alumnos, Secciones, Componentes, Inscripciones, Temas).'];
                    }
                }
            }

            // 2) Importar con transacción
            $db->beginTransaction();

            $resumen = [
                'periodo'       => ['inserted'=>0,'updated'=>0],
                'carreras'      => ['inserted'=>0,'updated'=>0],
                'materias'      => ['inserted'=>0,'updated'=>0],
                'carrera_materia'=>['inserted'=>0,'updated'=>0],
                'materia_area'  => ['inserted'=>0,'updated'=>0],
                'alumnos'       => ['inserted'=>0,'updated'=>0],
                'estudiante_profile'=>['inserted'=>0,'updated'=>0],
                'docentes'      => ['inserted'=>0,'updated'=>0],
                'docente_profile'=>['inserted'=>0,'updated'=>0],
                'area_docente_tc'=>['inserted'=>0,'updated'=>0],
                'secciones'     => ['inserted'=>0,'updated'=>0],
                'componentes'   => ['inserted'=>0,'updated'=>0],
                'inscripciones' => ['inserted'=>0,'updated'=>0],
                'temas'         => ['inserted'=>0,'updated'=>0],
            ];

            $periodoId = self::upsertPeriodo($db, $codigoPeriodo, $fechaInicio, $fechaFin, $resumen['periodo']);

            // caches
            $carreraByCodigo = [];
            $materiaByCodigo = [];
            $seccionByKey    = []; // "carrera|materia|grupo" => id
            $seccionesByGrupo = []; // "grupo" => [ids...]

            // Carreras
            foreach ($data['carreras'] as $row) {
                $codigo = trim((string)($row['codigo_carrera'] ?? ''));
                $nombre = trim((string)($row['nombre_carrera'] ?? ''));
                $estado = strtolower(trim((string)($row['estado'] ?? 'activa')));
                if ($codigo === '' || $nombre === '') {
                    $warnings[] = ['sheet'=>'Carreras','msg'=>"Fila inválida (falta código o nombre)."];
                    continue;
                }
                if (!in_array($estado, ['activa','inactiva'], true)) $estado = 'activa';

                $id = self::upsertCarrera($db, [
                    'codigo_carrera' => $codigo,
                    'nombre_carrera' => $nombre,
                    'estado'         => $estado,
                    'area_id'        => $areaId,
                    'coordinador_id' => ($userId > 0 ? $userId : null),
                ], $resumen['carreras']);

                $carreraByCodigo[$codigo] = $id;
            }

            // Materias (+ materia_area + carrera_materia)
            foreach ($data['materias'] as $row) {
                $codigoCarrera = trim((string)($row['codigo_carrera'] ?? ''));
                $codigoMateria = trim((string)($row['codigo_materia'] ?? ''));
                $nombreMateria = trim((string)($row['nombre_materia'] ?? ''));
                $tipoEval      = strtolower(trim((string)($row['tipo_evaluacion'] ?? 'teorica')));
                $estado        = strtolower(trim((string)($row['estado'] ?? 'activa')));
                $numSemestre   = (int)($row['num_semestre'] ?? 0);

                if ($codigoCarrera === '' || $codigoMateria === '' || $nombreMateria === '') {
                    $warnings[] = ['sheet'=>'Materias','msg'=>'Fila inválida (falta codigo_carrera/codigo_materia/nombre).'];
                    continue;
                }
                if (!isset($carreraByCodigo[$codigoCarrera])) {
                    $carreraByCodigo[$codigoCarrera] = self::findCarreraId($db, $codigoCarrera);
                }
                $carreraId = (int)($carreraByCodigo[$codigoCarrera] ?? 0);
                if ($carreraId <= 0) {
                    $warnings[] = ['sheet'=>'Materias','msg'=>"Carrera no encontrada para codigo_carrera={$codigoCarrera}."];
                    continue;
                }

                if (!in_array($tipoEval, ['teorica','practica'], true)) $tipoEval = 'teorica';
                if (!in_array($estado, ['activa','inactiva'], true)) $estado = 'activa';
                if ($numSemestre <= 0) $numSemestre = 1; // fallback para que no truene el NOT NULL

                $materiaId = self::upsertMateria($db, [
                    'codigo_materia' => $codigoMateria,
                    'nombre_materia' => $nombreMateria,
                    'tipo_evaluacion'=> $tipoEval,
                    'estado'         => $estado,
                ], $resumen['materias']);

                $materiaByCodigo[$codigoMateria] = $materiaId;

                self::upsertMateriaArea($db, $materiaId, $areaId, $resumen['materia_area']);
                self::upsertCarreraMateria($db, $carreraId, $materiaId, $numSemestre, $estado, $resumen['carrera_materia']);
            }

            // Alumnos (+ estudiante_profile)
            foreach ($data['alumnos'] as $row) {
                $matricula = trim((string)($row['matricula'] ?? ''));
                $nombre    = trim((string)($row['nombre_completo'] ?? ''));
                $correo    = strtolower(trim((string)($row['correo'] ?? '')));
                $fnac      = trim((string)($row['fecha_nacimiento'] ?? ''));
                $codCarr   = trim((string)($row['codigo_carrera'] ?? ''));

                if ($matricula === '' || $nombre === '' || $correo === '' || $fnac === '' || $codCarr === '') {
                    $warnings[] = ['sheet'=>'Alumnos','msg'=>'Fila inválida (faltan datos: matricula/nombre/correo/fecha_nacimiento/codigo_carrera).'];
                    continue;
                }

                if (!isset($carreraByCodigo[$codCarr])) $carreraByCodigo[$codCarr] = self::findCarreraId($db, $codCarr);
                $carreraId = (int)($carreraByCodigo[$codCarr] ?? 0);
                if ($carreraId <= 0) {
                    $warnings[] = ['sheet'=>'Alumnos','msg'=>"Carrera no encontrada para codigo_carrera={$codCarr} (matricula={$matricula})."];
                    continue;
                }

                $ddmmaaaa = self::toDdMmYyyyCompact($fnac);
                if ($ddmmaaaa === null) {
                    $warnings[] = ['sheet'=>'Alumnos','msg'=>"fecha_nacimiento inválida (matricula={$matricula}). Usa dd/mm/aaaa o aaaa-mm-dd."];
                    continue;
                }

                $passHash = password_hash($ddmmaaaa, PASSWORD_BCRYPT);

                $userIdAlumno = self::upsertUsuarioAlumno($db, [
                    'rol_id'          => 5,
                    'nombre_completo' => $nombre,
                    'correo'          => $correo,
                    'matricula'       => (int)$matricula,
                    'password_hash'   => $passHash,
                    'estado'          => 'activo',
                ], $resumen['alumnos']);

                self::upsertEstudianteProfile($db, $userIdAlumno, $carreraId, $resumen['estudiante_profile']);
            }

            // Docentes (+ docente_profile + area_docente_tc)
            foreach ($data['docentes'] as $row) {
                $matricula = trim((string)($row['matricula'] ?? ''));
                $nombre    = trim((string)($row['nombre_completo'] ?? ''));
                $correo    = strtolower(trim((string)($row['correo'] ?? '')));
                $fnac      = trim((string)($row['fecha_nacimiento'] ?? ''));
                $tipo      = strtolower(trim((string)($row['tipo_docente'] ?? 'general')));
                $estado    = strtolower(trim((string)($row['estado'] ?? 'activo')));
                $areaResp  = trim((string)($row['area_responsable'] ?? ''));

                if ($matricula === '' || $nombre === '' || $correo === '' || $fnac === '') {
                    $warnings[] = ['sheet'=>'Docentes','msg'=>'Fila inválida (faltan datos: matricula/nombre/correo/fecha_nacimiento).'];
                    continue;
                }

                // Validar tipo
                if (!in_array($tipo, ['tiempo_completo','general'], true)) {
                    $warnings[] = ['sheet'=>'Docentes','msg'=>"tipo_docente inválido: '{$tipo}' (matricula={$matricula}). Usa 'tiempo_completo' o 'general'."];
                    continue;
                }

                if (!in_array($estado, ['activo','inactivo'], true)) $estado = 'activo';

                // Convertir fecha_nacimiento a ddmmaaaa
                $ddmmaaaa = self::toDdMmYyyyCompact($fnac);
                if ($ddmmaaaa === null) {
                    $warnings[] = ['sheet'=>'Docentes','msg'=>"fecha_nacimiento inválida (matricula={$matricula}). Usa dd/mm/aaaa o aaaa-mm-dd."];
                    continue;
                }

                $passHash = password_hash($ddmmaaaa, PASSWORD_BCRYPT);

                // Determinar rol_id
                $rolId = ($tipo === 'tiempo_completo') ? 3 : 4;

                // Upsert usuario docente
                $userIdDocente = self::upsertUsuarioDocente($db, [
                    'rol_id'          => $rolId,
                    'nombre_completo' => $nombre,
                    'correo'          => $correo,
                    'matricula'       => (int)$matricula,
                    'password_hash'   => $passHash,
                    'estado'          => $estado,
                ], $resumen['docentes']);

                // Upsert docente_profile
                $categoria = ($tipo === 'tiempo_completo') ? 'tiempo_completo' : 'general';
                self::upsertDocenteProfile($db, $userIdDocente, $categoria, $resumen['docente_profile']);

                // Si es tiempo completo Y tiene area_responsable, crear area_docente_tc
                if ($tipo === 'tiempo_completo' && $areaResp !== '') {
                    $areaIdResp = self::findAreaIdByNombre($db, $areaResp);
                    if ($areaIdResp > 0) {
                        self::upsertAreaDocenteTC($db, $areaIdResp, $userIdDocente, $resumen['area_docente_tc']);
                    } else {
                        $warnings[] = ['sheet'=>'Docentes','msg'=>"Área '{$areaResp}' no encontrada para docente TC (matricula={$matricula})."];
                    }
                }
            }

            // Secciones
            foreach ($data['secciones'] as $row) {
                $codCarr = trim((string)($row['codigo_carrera'] ?? ''));
                $codMat  = trim((string)($row['codigo_materia'] ?? ''));
                $grupo   = trim((string)($row['grupo'] ?? ''));
                $correoDoc = strtolower(trim((string)($row['correo_docente'] ?? '')));
                $modalidad = strtolower(trim((string)($row['modalidad'] ?? 'presencial')));
                $estado    = strtolower(trim((string)($row['estado'] ?? 'activa')));

                if ($codCarr === '' || $codMat === '' || $grupo === '') {
                    $warnings[] = ['sheet'=>'Secciones','msg'=>'Fila inválida (falta codigo_carrera/codigo_materia/grupo).'];
                    continue;
                }

                if (!isset($carreraByCodigo[$codCarr])) $carreraByCodigo[$codCarr] = self::findCarreraId($db, $codCarr);
                $carreraId = (int)($carreraByCodigo[$codCarr] ?? 0);

                if (!isset($materiaByCodigo[$codMat])) $materiaByCodigo[$codMat] = self::findMateriaId($db, $codMat);
                $materiaId = (int)($materiaByCodigo[$codMat] ?? 0);

                if ($carreraId <= 0 || $materiaId <= 0) {
                    $warnings[] = ['sheet'=>'Secciones','msg'=>"No encontré carrera/materia para {$codCarr} / {$codMat} (grupo={$grupo})."];
                    continue;
                }

                if (!in_array($modalidad, ['presencial','linea','mixta'], true)) $modalidad = 'presencial';
                if (!in_array($estado, ['activa','inactiva'], true)) $estado = 'activa';

                $docenteId = null;
                if ($correoDoc !== '') {
                    $docenteId = self::findUsuarioIdByCorreo($db, $correoDoc);
                    if (!$docenteId) {
                        $warnings[] = ['sheet'=>'Secciones','msg'=>"Docente no encontrado por correo {$correoDoc} (grupo={$grupo}). Se dejó NULL."];
                    }
                }

                $seccionId = self::upsertSeccion($db, [
                    'materia_id' => $materiaId,
                    'carrera_id' => $carreraId,
                    'periodo_id' => $periodoId,
                    'grupo'      => $grupo,
                    'docente_id' => $docenteId,
                    'modalidad'  => $modalidad,
                    'estado'     => $estado,
                ], $resumen['secciones']);

                $key = "{$codCarr}|{$codMat}|{$grupo}";
                $seccionByKey[$key] = $seccionId;
                $seccionesByGrupo[$grupo] = $seccionesByGrupo[$grupo] ?? [];
                $seccionesByGrupo[$grupo][] = $seccionId;
            }

            // Componentes
            foreach ($data['componentes'] as $row) {
                $grupo = trim((string)($row['grupo'] ?? ''));
                $tipo  = strtolower(trim((string)($row['tipo'] ?? '')));
                $crn   = trim((string)($row['crn'] ?? ''));
                $peso  = $row['peso_porcentaje'] ?? $row['peso'] ?? null;

                $codCarr = trim((string)($row['codigo_carrera'] ?? ''));
                $codMat  = trim((string)($row['codigo_materia'] ?? ''));

                if ($grupo === '' || $tipo === '' || $crn === '') {
                    $warnings[] = ['sheet'=>'Componentes','msg'=>'Fila inválida (falta grupo/tipo/crn).'];
                    continue;
                }
                if (!in_array($tipo, ['continua','blackboard','examen'], true)) {
                    $warnings[] = ['sheet'=>'Componentes','msg'=>"tipo inválido: {$tipo} (grupo={$grupo})."];
                    continue;
                }

                $seccionId = self::resolveSeccionId($grupo, $codCarr, $codMat, $seccionByKey, $seccionesByGrupo, $warnings, 'Componentes');
                if (!$seccionId) continue;

                // si el crn ya existe en otra seccion, mejor avisar y saltar
                $existingCrn = self::findComponenteByCrn($db, $crn);
                if ($existingCrn && (int)$existingCrn['seccion_id'] !== (int)$seccionId) {
                    $warnings[] = ['sheet'=>'Componentes','msg'=>"CRN ya existe en otra sección (crn={$crn}). Se omitió."];
                    continue;
                }

                $pesoNum = null;
                if ($peso !== null && $peso !== '') {
                    $pesoNum = (float)$peso;
                    if ($pesoNum < 0) $pesoNum = 0;
                    if ($pesoNum > 100) $pesoNum = 100;
                }

                self::upsertSeccionComponente($db, [
                    'seccion_id' => $seccionId,
                    'tipo' => $tipo,
                    'crn' => $crn,
                    'peso_porcentaje' => $pesoNum,
                    'estado' => 'activo',
                ], $resumen['componentes']);
            }

            // Inscripciones
            foreach ($data['inscripciones'] as $row) {
                $grupo     = trim((string)($row['grupo'] ?? ''));
                $matricula = trim((string)($row['matricula'] ?? ''));
                $estado    = strtolower(trim((string)($row['estado'] ?? 'inscrito')));
                $metodo    = strtolower(trim((string)($row['metodo'] ?? 'presencial')));

                $codCarr = trim((string)($row['codigo_carrera'] ?? ''));
                $codMat  = trim((string)($row['codigo_materia'] ?? ''));

                if ($grupo === '' || $matricula === '') {
                    $warnings[] = ['sheet'=>'Inscripciones','msg'=>'Fila inválida (falta grupo/matricula).'];
                    continue;
                }

                $seccionId = self::resolveSeccionId($grupo, $codCarr, $codMat, $seccionByKey, $seccionesByGrupo, $warnings, 'Inscripciones');
                if (!$seccionId) continue;

                $estudianteId = self::findUsuarioIdByMatricula($db, (int)$matricula);
                if (!$estudianteId) {
                    $warnings[] = ['sheet'=>'Inscripciones','msg'=>"No encontré alumno por matrícula {$matricula} (grupo={$grupo})."];
                    continue;
                }

                if (!in_array($estado, ['inscrito','baja'], true)) $estado = 'inscrito';
                // inscripcion.metodo NO acepta mixta
                if ($metodo === 'mixta') $metodo = 'presencial';
                if (!in_array($metodo, ['presencial','linea'], true)) $metodo = 'presencial';

                self::upsertInscripcion($db, [
                    'seccion_id'    => $seccionId,
                    'estudiante_id' => $estudianteId,
                    'estado'        => $estado,
                    'metodo'        => $metodo,
                ], $resumen['inscripciones']);
            }

            // Temas
            foreach ($data['temas'] as $row) {
                $codMat = trim((string)($row['codigo_materia'] ?? ''));
                $parcialId = $row['parcial_id'] ?? $row['parcial'] ?? null;
                $nombre = trim((string)($row['nombre'] ?? $row['nombre_tema'] ?? ''));
                $estado = strtolower(trim((string)($row['estado'] ?? 'activo')));

                if ($codMat === '' || $nombre === '') {
                    $warnings[] = ['sheet'=>'Temas','msg'=>'Fila inválida (falta codigo_materia/nombre).'];
                    continue;
                }
                if (!isset($materiaByCodigo[$codMat])) $materiaByCodigo[$codMat] = self::findMateriaId($db, $codMat);
                $materiaId = (int)($materiaByCodigo[$codMat] ?? 0);
                if ($materiaId <= 0) {
                    $warnings[] = ['sheet'=>'Temas','msg'=>"Materia no encontrada para codigo_materia={$codMat}."];
                    continue;
                }

                $pid = null;
                if ($parcialId !== null && $parcialId !== '') {
                    $pid = (int)$parcialId;
                    if ($pid <= 0) $pid = null;
                }

                if (!in_array($estado, ['activo','inactivo'], true)) $estado = 'activo';

                self::upsertTema($db, [
                    'materia_id' => $materiaId,
                    'parcial_id' => $pid,
                    'nombre'     => $nombre,
                    'estado'     => $estado,
                ], $resumen['temas']);
            }

            $db->commit();

            return self::json(200, [
                'ok' => true,
                'periodo' => $codigoPeriodo,
                'area_id' => $areaId,
                'resumen' => $resumen,
                'warnings' => $warnings,
                'parsed' => [
                    'carreras' => count($data['carreras']),
                    'materias' => count($data['materias']),
                    'alumnos' => count($data['alumnos']),
                    'docentes' => count($data['docentes']),
                    'secciones' => count($data['secciones']),
                    'componentes' => count($data['componentes']),
                    'inscripciones' => count($data['inscripciones']),
                    'temas' => count($data['temas']),
                ],
            ]);

        } catch (Exception $e) {
            if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
                $db->rollBack();
            }
            return self::json(500, ['ok'=>false,'response'=>$e->getMessage()]);
        }
    }

    // -------------------------
    // Resolución de seccion_id (porque "grupo" no es único)
    // -------------------------
    private static function resolveSeccionId($grupo, $codCarr, $codMat, $seccionByKey, $seccionesByGrupo, &$warnings, $sheetName)
    {
        if ($codCarr !== '' && $codMat !== '') {
            $key = "{$codCarr}|{$codMat}|{$grupo}";
            if (isset($seccionByKey[$key])) return (int)$seccionByKey[$key];
        }

        $list = $seccionesByGrupo[$grupo] ?? [];
        if (count($list) === 1) return (int)$list[0];

        if (count($list) === 0) {
            $warnings[] = ['sheet'=>$sheetName,'msg'=>"No encontré sección para grupo={$grupo}. (Tip: agrega codigo_carrera y codigo_materia en la hoja)."];
            return null;
        }

        $warnings[] = ['sheet'=>$sheetName,'msg'=>"Grupo {$grupo} es ambiguo (hay ".count($list)." secciones). (Tip: agrega codigo_carrera y codigo_materia en la hoja)."];
        return null;
    }

    private static function wsGetCell($ws, int $col, int $row)
    {
        // Algunas versiones traen getCellByColumnAndRow, otras no.
        if (method_exists($ws, 'getCellByColumnAndRow')) {
            return $ws->getCellByColumnAndRow($col, $row);
        }

        // Fallback universal: convertir col (1..n) a letra (A..)
        if (class_exists(Coordinate::class)) {
            $coord = Coordinate::stringFromColumnIndex($col) . $row;
            return $ws->getCell($coord);
        }

        // Ultra fallback (si por alguna razón no existe Coordinate)
        $letters = '';
        $n = $col;
        while ($n > 0) {
            $r = ($n - 1) % 26;
            $letters = chr(65 + $r) . $letters;
            $n = intdiv($n - 1, 26);
        }
        return $ws->getCell($letters . $row);
    }

    private static function wsGetValue($ws, int $col, int $row)
    {
        $cell = self::wsGetCell($ws, $col, $row);
        $v = $cell ? $cell->getValue() : null; // usa getValue (más estable)
        if (is_string($v)) $v = trim($v);
        return $v;
    }

    // -------------------------
    // Excel parsing
    // -------------------------
    private static function detectSheetType(string $name): ?string
    {
        $n = self::norm($name);

        // Preferir coincidencias "claras"
        if (str_contains($n, 'alumn')) return 'alumnos';
        if (str_contains($n, 'docent')) return 'docentes'; 
        if (str_contains($n, 'maestr')) return 'docentes';
        if (str_contains($n, 'profesor')) return 'docentes'; 
        if (str_contains($n, 'carrer')) return 'carreras';
        if (str_contains($n, 'materi') && !str_contains($n, 'materia area')) return 'materias';
        if (str_contains($n, 'seccion') || str_contains($n, 'grupo') || str_contains($n, 'clase')) return 'secciones';
        if (str_contains($n, 'component')) return 'componentes';
        if (str_contains($n, 'inscrip')) return 'inscripciones';
        if (str_contains($n, 'tema')) return 'temas';

        return null;
    }

    /**
     * Lector robusto:
     * - NO depende de Worksheet::toArray (que cambia llaves según versión/configuración)
     * - Encuentra automáticamente la fila de headers (1..10) que mejor matchea los campos esperados.
     */
    private static function readWorksheet($worksheet, string $type, array &$warnings, string $fileName, string $sheetTitle): array
    {
        $highestRow = (int)$worksheet->getHighestDataRow();
        $highestCol = (string)$worksheet->getHighestDataColumn();
        $highestColIndex = (int)Coordinate::columnIndexFromString($highestCol);

        if ($highestRow < 2 || $highestColIndex < 1) return [];

        // 1) Detectar la fila de headers (por score)
        $bestHeaderRow = 1;
        $bestMap = [];
        $bestScore = 0;

        $scanMax = min(10, $highestRow);
        for ($r = 1; $r <= $scanMax; $r++) {
            $headerRow = self::readRowValues($worksheet, $r, $highestColIndex);
            
            $map = self::buildHeaderMap($type, $headerRow);
            $score = count($map);
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMap = $map;
                $bestHeaderRow = $r;
            }
        }

        if ($bestScore === 0) {
            $warnings[] = ['file'=>$fileName,'sheet'=>$sheetTitle,'msg'=>"No encontré headers válidos para {$type}. Se omitió hoja."];
            return [];
        }

        // 2) Leer filas desde la siguiente a headers
        $rows = [];
        for ($r = $bestHeaderRow + 1; $r <= $highestRow; $r++) {
            $parsed = [];
            $emptyCount = 0;

            foreach ($bestMap as $colIndex => $field) {
                $val = self::readCellValue($worksheet, (int)$colIndex, $r);
                if ($val === null || $val === '') $emptyCount++;
                $parsed[$field] = is_string($val) ? trim($val) : $val;
            }

            if ($emptyCount === count($bestMap)) continue;

            $parsed = self::normalizeRow($type, $parsed);
            $rows[] = $parsed;
        }

        return $rows;
    }

    // Método auxiliar para debugging
    private static function getExpectedFields(string $type): array
    {
        $dict = [
            'alumnos' => [
                'matricula' => true,
                'nombre_completo' => true,
                'correo' => true,
                'fecha_nacimiento' => true,
                'codigo_carrera' => true,
            ],
            'carreras' => [
                'codigo_carrera' => true,
                'nombre_carrera' => true,
                'estado' => true,
            ],
        ];
        return $dict[$type] ?? [];
    }

    private static function readRowValues($worksheet, int $rowIndex, int $maxColIndex): array
    {
        $out = [];
        for ($c = 1; $c <= $maxColIndex; $c++) {
            $val = self::readCellValue($worksheet, $c, $rowIndex);
            $out[$c] = is_string($val) ? trim($val) : $val;
        }
        return $out;
    }

    private static function readCellValue($worksheet, int $colIndex, int $rowIndex)
    {
        $cell = self::wsGetCell($worksheet, $colIndex, $rowIndex);
        try {
            if (\PhpOffice\PhpSpreadsheet\Shared\Date::isDateTime($cell)) {
                return $cell->getValue();
            }
        } catch (\Throwable $e) {
        }

        // (tu lógica actual)
        try {
            $val = $cell->getFormattedValue();
        } catch (\Throwable $e) {
            $val = $cell->getValue();
        }

        if ($val instanceof \PhpOffice\PhpSpreadsheet\RichText\RichText) {
            $val = $val->getPlainText();
        }

        if (is_string($val) && strlen($val) > 0 && $val[0] === '=') {
            try { $val = $cell->getCalculatedValue(); } catch (\Throwable $e) {}
        }

        return $val;
    }

    private static function buildHeaderMap(string $type, array $headerRow): array
    {
        // Canonical fields por hoja
        $dict = [
            'alumnos' => [
                'matricula' => ['matricula','matrícula','mat','id','id alumno','id_alumno'],
                'nombre_completo' => ['nombre','nombre completo','nombre_completo','alumno','estudiante'],
                'correo' => ['correo','email','e-mail','mail'],
                'fecha_nacimiento' => ['fecha nacimiento','fecha_nacimiento','nacimiento','fnac','dob'],
                'codigo_carrera' => ['codigo carrera','código carrera','codigo_carrera','carrera','carrera codigo','clave carrera'],
            ],
            'docentes' => [
                'matricula' => ['matricula','matrícula','mat','id','id docente','id_docente'],
                'nombre_completo' => ['nombre','nombre completo','nombre_completo','docente','maestro','profesor'],
                'correo' => ['correo','email','e-mail','mail'],
                'fecha_nacimiento' => ['fecha nacimiento','fecha_nacimiento','nacimiento','fnac','dob'],
                'tipo_docente' => ['tipo','tipo docente','tipo_docente','categoria','categoría'],
                'estado' => ['estado','activo','inactivo'],
                'area_responsable' => ['area','área','area responsable','area_responsable','codigo area','código área'],
            ],
            'carreras' => [
                'codigo_carrera' => ['codigo carrera','código carrera','codigo_carrera','clave','codigo'],
                'nombre_carrera' => ['nombre','nombre carrera','nombre_carrera'],
                'estado' => ['estado','activa','inactiva'],
            ],
            'materias' => [
                'codigo_carrera' => ['codigo carrera','código carrera','codigo_carrera','carrera'],
                'codigo_materia' => ['codigo materia','código materia','codigo_materia','materia codigo','clave materia'],
                'nombre_materia' => ['nombre','nombre materia','nombre_materia'],
                'tipo_evaluacion' => ['tipo evaluacion','tipo_evaluacion','evaluacion','tipo'],
                'estado' => ['estado'],
                'num_semestre' => ['semestre','num_semestre','numero semestre','número semestre'],
            ],
            'secciones' => [
                'codigo_carrera' => ['codigo carrera','código carrera','codigo_carrera','carrera'],
                'codigo_materia' => ['codigo materia','código materia','codigo_materia','materia'],
                'grupo' => ['grupo','codigo grupo','código grupo','grupo codigo','codigo_grupo'],
                'correo_docente' => ['correo docente','email docente','docente','correo_docente','maestro'],
                'modalidad' => ['modalidad'],
                'estado' => ['estado'],
            ],
            'componentes' => [
                'grupo' => ['grupo','codigo grupo','código grupo','codigo_grupo'],
                'tipo'  => ['tipo','tipo componente','tipo_componente','componente'],
                'crn'   => ['crn'],
                'peso_porcentaje' => ['peso','peso_porcentaje','peso porcentaje','porcentaje','%'],
                'codigo_carrera' => ['codigo carrera','código carrera','codigo_carrera','carrera'],
                'codigo_materia' => ['codigo materia','código materia','codigo_materia','materia'],
            ],
            'inscripciones' => [
                'grupo' => ['grupo','codigo grupo','código grupo','codigo_grupo'],
                'matricula' => ['matricula','matrícula','mat'],
                'estado' => ['estado'],
                'metodo' => ['metodo','método','modalidad','tipo'],
                'codigo_carrera' => ['codigo carrera','código carrera','codigo_carrera','carrera'],
                'codigo_materia' => ['codigo materia','código materia','codigo_materia','materia'],
            ],
            'temas' => [
                'codigo_materia' => ['codigo materia','código materia','codigo_materia','materia'],
                'parcial_id' => ['parcial','parcial_id','parcial id','parcial al que pertenece','parcial pertenece'],
                'nombre_tema' => ['tema','nombre','nombre tema','nombre_tema'],
                'estado' => ['estado'],
            ],
        ];

        $wanted = $dict[$type] ?? [];
        if (!$wanted) return [];

        // Normalizar headers reales
        $real = [];
        foreach ($headerRow as $col => $h) {
            $k = self::norm((string)$h);
            $real[$col] = $k;
        }

        // Match por synonyms (igualdad exacta normalizada)
        $map = [];
        foreach ($real as $col => $headerNorm) {
            $matched = false;
            foreach ($wanted as $field => $syns) {
                if ($matched) break; // Ya encontró match para esta columna
                
                foreach ($syns as $s) {
                    if ($headerNorm === self::norm($s)) {
                        // 'temas' usa nombre_tema pero internamente preferimos 'nombre'
                        if ($type === 'temas' && $field === 'nombre_tema') {
                            $field = 'nombre';
                        }
                        $map[$col] = $field;
                        $matched = true;
                        break; // Sale del loop de sinónimos
                    }
                }
            }
        }

        return $map;
    }

    private static function normalizeRow(string $type, array $row): array
    {
        // normalizar llaves/valores comunes
        if (isset($row['correo'])) $row['correo'] = strtolower(trim((string)$row['correo']));
        if (isset($row['correo_docente'])) $row['correo_docente'] = strtolower(trim((string)$row['correo_docente']));
        if (isset($row['codigo_carrera'])) $row['codigo_carrera'] = trim((string)$row['codigo_carrera']);
        if (isset($row['codigo_materia'])) $row['codigo_materia'] = trim((string)$row['codigo_materia']);
        if (isset($row['grupo'])) $row['grupo'] = trim((string)$row['grupo']);
        if (isset($row['tipo_evaluacion'])) $row['tipo_evaluacion'] = strtolower(trim((string)$row['tipo_evaluacion']));
        if (isset($row['tipo'])) $row['tipo'] = strtolower(trim((string)$row['tipo']));
        if ($type === 'temas' && isset($row['nombre'])) $row['nombre'] = trim((string)$row['nombre']);
        if ($type === 'alumnos' && isset($row['fecha_nacimiento'])) $row['fecha_nacimiento'] = trim((string)$row['fecha_nacimiento']);

        return $row;
    }

    private static function norm(string $s): string
    {
        $s = trim(mb_strtolower($s));
        $s = str_replace(['_', '-', '.', ',', ';', ':'], ' ', $s);
        $s = preg_replace('/\s+/', ' ', $s);

        // quitar acentos (sin depender de ext-intl)
        if (class_exists('Normalizer')) {
            $s = \Normalizer::normalize($s, \Normalizer::FORM_D);
            $s = preg_replace('/\p{Mn}+/u', '', $s);
        } else {
            $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
            if ($t !== false) $s = $t;
        }

        return trim($s);
    }

    // -------------------------
    // DB helpers
    // -------------------------
    private static function db(): PDO
    {
        // 1) Global
        if (isset($GLOBALS['db']) && $GLOBALS['db'] instanceof PDO) return $GLOBALS['db'];

        // 2) Reflection a Model\ActiveRecord::$db (es protected)
        if (class_exists(\Model\ActiveRecord::class)) {
            $rc = new \ReflectionClass(\Model\ActiveRecord::class);
            if ($rc->hasProperty('db')) {
                $p = $rc->getProperty('db');
                $p->setAccessible(true);
                $val = $p->getValue();
                if ($val instanceof PDO) return $val;
            }
        }

        throw new Exception("No encontré conexión PDO. Expón \$GLOBALS['db'] o usa Model\\ActiveRecord::setDB(\$pdo).");
    }

    private static function getAuthUserId(): int
    {
        // depende de tu AuthMiddleware/Login: aquí intentamos varios "estándares"
        if (isset($_SESSION['user']['id'])) return (int)$_SESSION['user']['id'];
        if (isset($_SESSION['usuario']['id'])) return (int)$_SESSION['usuario']['id'];
        if (isset($_SESSION['usuario_id'])) return (int)$_SESSION['usuario_id'];
        if (isset($_SESSION['id'])) return (int)$_SESSION['id'];

        // Si tu middleware setea algo tipo $GLOBALS['auth_user']
        if (isset($GLOBALS['auth_user']['id'])) return (int)$GLOBALS['auth_user']['id'];

        return 0;
    }

    private static function getAreaIdFromCoordinator(PDO $db, int $usuarioId): int
    {
        $stmt = $db->prepare("SELECT area_id FROM coordinador_profile WHERE usuario_id = :u LIMIT 1");
        $stmt->execute([':u' => $usuarioId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['area_id'] : 0;
    }

    private static function upsertPeriodo(PDO $db, string $codigo, string $ini, string $fin, array &$cnt): int
    {
        $stmt = $db->prepare("SELECT id FROM periodo WHERE codigo = :c LIMIT 1");
        $stmt->execute([':c' => $codigo]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $id = (int)$row['id'];
            $u = $db->prepare("UPDATE periodo SET fecha_inicio = :i, fecha_fin = :f WHERE id = :id");
            $u->execute([':i'=>$ini,':f'=>$fin,':id'=>$id]);
            $cnt['updated']++;
            return $id;
        }

        $ins = $db->prepare("INSERT INTO periodo (codigo, nombre, fecha_inicio, fecha_fin, estado) VALUES (:c, :n, :i, :f, 'activo')");
        $ins->execute([':c'=>$codigo, ':n'=>$codigo, ':i'=>$ini, ':f'=>$fin]);
        $cnt['inserted']++;
        return (int)$db->lastInsertId();
    }

    private static function findCarreraId(PDO $db, string $codigo): int
    {
        $stmt = $db->prepare("SELECT id FROM carrera WHERE codigo_carrera = :c LIMIT 1");
        $stmt->execute([':c'=>$codigo]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['id'] : 0;
    }

    private static function upsertCarrera(PDO $db, array $v, array &$cnt): int
    {
        $id = self::findCarreraId($db, $v['codigo_carrera']);

        if ($id > 0) {
            $stmt = $db->prepare("
                UPDATE carrera
                SET nombre_carrera = :n,
                    estado = :e,
                    area_id = :a,
                    coordinador_id = :coord
                WHERE id = :id
            ");
            $stmt->execute([
                ':n'=>$v['nombre_carrera'],
                ':e'=>$v['estado'],
                ':a'=>$v['area_id'],
                ':coord'=>$v['coordinador_id'],
                ':id'=>$id
            ]);
            $cnt['updated']++;
            return $id;
        }

        $stmt = $db->prepare("
            INSERT INTO carrera (nombre_carrera, codigo_carrera, area_id, coordinador_id, estado)
            VALUES (:n, :c, :a, :coord, :e)
        ");
        $stmt->execute([
            ':n'=>$v['nombre_carrera'],
            ':c'=>$v['codigo_carrera'],
            ':a'=>$v['area_id'],
            ':coord'=>$v['coordinador_id'],
            ':e'=>$v['estado'],
        ]);
        $cnt['inserted']++;
        return (int)$db->lastInsertId();
    }

    private static function findMateriaId(PDO $db, string $codigo): int
    {
        $stmt = $db->prepare("SELECT id FROM materia WHERE codigo_materia = :c LIMIT 1");
        $stmt->execute([':c'=>$codigo]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['id'] : 0;
    }

    private static function upsertMateria(PDO $db, array $v, array &$cnt): int
    {
        $id = self::findMateriaId($db, $v['codigo_materia']);

        if ($id > 0) {
            $stmt = $db->prepare("
                UPDATE materia
                SET nombre_materia = :n,
                    tipo_evaluacion = :t,
                    estado = :e
                WHERE id = :id
            ");
            $stmt->execute([
                ':n'=>$v['nombre_materia'],
                ':t'=>$v['tipo_evaluacion'],
                ':e'=>$v['estado'],
                ':id'=>$id
            ]);
            $cnt['updated']++;
            return $id;
        }

        $stmt = $db->prepare("
            INSERT INTO materia (nombre_materia, codigo_materia, tipo_evaluacion, estado)
            VALUES (:n, :c, :t, :e)
        ");
        $stmt->execute([
            ':n'=>$v['nombre_materia'],
            ':c'=>$v['codigo_materia'],
            ':t'=>$v['tipo_evaluacion'],
            ':e'=>$v['estado'],
        ]);
        $cnt['inserted']++;
        return (int)$db->lastInsertId();
    }

    private static function upsertMateriaArea(PDO $db, int $materiaId, int $areaId, array &$cnt): void
    {
        $stmt = $db->prepare("SELECT 1 FROM materia_area WHERE materia_id = :m AND area_id = :a LIMIT 1");
        $stmt->execute([':m'=>$materiaId, ':a'=>$areaId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $cnt['updated']++;
            return;
        }

        $ins = $db->prepare("INSERT INTO materia_area (materia_id, area_id, es_estandarizable, estado) VALUES (:m, :a, 1, 'activa')");
        $ins->execute([':m'=>$materiaId, ':a'=>$areaId]);
        $cnt['inserted']++;
    }

    private static function upsertCarreraMateria(PDO $db, int $carreraId, int $materiaId, int $numSemestre, string $estado, array &$cnt): void
    {
        $stmt = $db->prepare("SELECT id FROM carrera_materia WHERE carrera_id = :c AND materia_id = :m LIMIT 1");
        $stmt->execute([':c'=>$carreraId, ':m'=>$materiaId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $u = $db->prepare("UPDATE carrera_materia SET num_semestre = :s, estado = :e WHERE id = :id");
            $u->execute([':s'=>$numSemestre, ':e'=>$estado, ':id'=>(int)$row['id']]);
            $cnt['updated']++;
            return;
        }

        $ins = $db->prepare("INSERT INTO carrera_materia (carrera_id, materia_id, num_semestre, estado) VALUES (:c, :m, :s, :e)");
        $ins->execute([':c'=>$carreraId, ':m'=>$materiaId, ':s'=>$numSemestre, ':e'=>$estado]);
        $cnt['inserted']++;
    }

    private static function findUsuarioIdByCorreo(PDO $db, string $correo): ?int
    {
        $stmt = $db->prepare("SELECT id FROM usuario WHERE correo = :c LIMIT 1");
        $stmt->execute([':c'=>$correo]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['id'] : null;
    }

    private static function findUsuarioIdByMatricula(PDO $db, int $matricula): ?int
    {
        $stmt = $db->prepare("SELECT id FROM usuario WHERE matricula = :m LIMIT 1");
        $stmt->execute([':m'=>$matricula]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['id'] : null;
    }

    private static function upsertUsuarioAlumno(PDO $db, array $v, array &$cnt): int
    {
        // upsert por matrícula (y si falla, por correo)
        $stmt = $db->prepare("SELECT id FROM usuario WHERE matricula = :m LIMIT 1");
        $stmt->execute([':m'=>$v['matricula']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $stmt2 = $db->prepare("SELECT id FROM usuario WHERE correo = :c LIMIT 1");
            $stmt2->execute([':c'=>$v['correo']]);
            $row = $stmt2->fetch(PDO::FETCH_ASSOC);
        }

        if ($row) {
            $id = (int)$row['id'];
            $u = $db->prepare("
                UPDATE usuario
                SET rol_id = :r,
                    nombre_completo = :n,
                    correo = :c,
                    matricula = :m,
                    password_hash = :p,
                    estado = :e
                WHERE id = :id
            ");
            $u->execute([
                ':r'=>$v['rol_id'],
                ':n'=>$v['nombre_completo'],
                ':c'=>$v['correo'],
                ':m'=>$v['matricula'],
                ':p'=>$v['password_hash'],
                ':e'=>$v['estado'],
                ':id'=>$id,
            ]);
            $cnt['updated']++;
            return $id;
        }

        $ins = $db->prepare("
            INSERT INTO usuario (rol_id, nombre_completo, correo, matricula, password_hash, estado)
            VALUES (:r, :n, :c, :m, :p, :e)
        ");
        $ins->execute([
            ':r'=>$v['rol_id'],
            ':n'=>$v['nombre_completo'],
            ':c'=>$v['correo'],
            ':m'=>$v['matricula'],
            ':p'=>$v['password_hash'],
            ':e'=>$v['estado'],
        ]);
        $cnt['inserted']++;
        return (int)$db->lastInsertId();
    }

    private static function upsertEstudianteProfile(PDO $db, int $usuarioId, int $carreraId, array &$cnt): void
    {
        $stmt = $db->prepare("SELECT 1 FROM estudiante_profile WHERE usuario_id = :u LIMIT 1");
        $stmt->execute([':u'=>$usuarioId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $u = $db->prepare("UPDATE estudiante_profile SET carrera_id = :c WHERE usuario_id = :u");
            $u->execute([':c'=>$carreraId, ':u'=>$usuarioId]);
            $cnt['updated']++;
            return;
        }

        $ins = $db->prepare("INSERT INTO estudiante_profile (usuario_id, carrera_id) VALUES (:u, :c)");
        $ins->execute([':u'=>$usuarioId, ':c'=>$carreraId]);
        $cnt['inserted']++;
    }

    private static function upsertSeccion(PDO $db, array $v, array &$cnt): int
    {
        $stmt = $db->prepare("
            SELECT id FROM seccion
            WHERE materia_id = :m AND carrera_id = :c AND periodo_id = :p AND grupo = :g
            LIMIT 1
        ");
        $stmt->execute([
            ':m'=>$v['materia_id'],
            ':c'=>$v['carrera_id'],
            ':p'=>$v['periodo_id'],
            ':g'=>$v['grupo'],
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $id = (int)$row['id'];
            $u = $db->prepare("
                UPDATE seccion
                SET docente_id = :d,
                    modalidad = :mo,
                    estado = :e
                WHERE id = :id
            ");
            $u->execute([
                ':d'=>$v['docente_id'],
                ':mo'=>$v['modalidad'],
                ':e'=>$v['estado'],
                ':id'=>$id,
            ]);
            $cnt['updated']++;
            return $id;
        }

        $ins = $db->prepare("
            INSERT INTO seccion (materia_id, carrera_id, periodo_id, grupo, docente_id, modalidad, estado)
            VALUES (:m, :c, :p, :g, :d, :mo, :e)
        ");
        $ins->execute([
            ':m'=>$v['materia_id'],
            ':c'=>$v['carrera_id'],
            ':p'=>$v['periodo_id'],
            ':g'=>$v['grupo'],
            ':d'=>$v['docente_id'],
            ':mo'=>$v['modalidad'],
            ':e'=>$v['estado'],
        ]);
        $cnt['inserted']++;
        return (int)$db->lastInsertId();
    }

    private static function findComponenteByCrn(PDO $db, string $crn): ?array
    {
        $stmt = $db->prepare("SELECT id, seccion_id FROM seccion_componente WHERE crn = :c LIMIT 1");
        $stmt->execute([':c'=>$crn]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private static function upsertSeccionComponente(PDO $db, array $v, array &$cnt): void
    {
        $stmt = $db->prepare("SELECT id FROM seccion_componente WHERE seccion_id = :s AND tipo = :t LIMIT 1");
        $stmt->execute([':s'=>$v['seccion_id'], ':t'=>$v['tipo']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $u = $db->prepare("
                UPDATE seccion_componente
                SET crn = :c,
                    peso_porcentaje = :p,
                    estado = :e
                WHERE id = :id
            ");
            $u->execute([
                ':c'=>$v['crn'],
                ':p'=>$v['peso_porcentaje'],
                ':e'=>$v['estado'],
                ':id'=>(int)$row['id'],
            ]);
            $cnt['updated']++;
            return;
        }

        $ins = $db->prepare("
            INSERT INTO seccion_componente (seccion_id, tipo, crn, peso_porcentaje, estado)
            VALUES (:s, :t, :c, :p, :e)
        ");
        $ins->execute([
            ':s'=>$v['seccion_id'],
            ':t'=>$v['tipo'],
            ':c'=>$v['crn'],
            ':p'=>$v['peso_porcentaje'],
            ':e'=>$v['estado'],
        ]);
        $cnt['inserted']++;
    }

    private static function upsertInscripcion(PDO $db, array $v, array &$cnt): void
    {
        $stmt = $db->prepare("SELECT id FROM inscripcion WHERE seccion_id = :s AND estudiante_id = :e LIMIT 1");
        $stmt->execute([':s'=>$v['seccion_id'], ':e'=>$v['estudiante_id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $u = $db->prepare("UPDATE inscripcion SET estado = :st, metodo = :m WHERE id = :id");
            $u->execute([':st'=>$v['estado'], ':m'=>$v['metodo'], ':id'=>(int)$row['id']]);
            $cnt['updated']++;
            return;
        }

        $ins = $db->prepare("INSERT INTO inscripcion (seccion_id, estudiante_id, estado, metodo) VALUES (:s, :e, :st, :m)");
        $ins->execute([':s'=>$v['seccion_id'], ':e'=>$v['estudiante_id'], ':st'=>$v['estado'], ':m'=>$v['metodo']]);
        $cnt['inserted']++;
    }

    private static function upsertTema(PDO $db, array $v, array &$cnt): void
    {
        // parcial_id puede ser NULL, entonces la comparación necesita IS NULL
        if ($v['parcial_id'] === null) {
            $stmt = $db->prepare("SELECT id FROM tema WHERE materia_id = :m AND parcial_id IS NULL AND nombre = :n LIMIT 1");
            $stmt->execute([':m'=>$v['materia_id'], ':n'=>$v['nombre']]);
        } else {
            $stmt = $db->prepare("SELECT id FROM tema WHERE materia_id = :m AND parcial_id = :p AND nombre = :n LIMIT 1");
            $stmt->execute([':m'=>$v['materia_id'], ':p'=>$v['parcial_id'], ':n'=>$v['nombre']]);
        }
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $u = $db->prepare("UPDATE tema SET estado = :e WHERE id = :id");
            $u->execute([':e'=>$v['estado'], ':id'=>(int)$row['id']]);
            $cnt['updated']++;
            return;
        }

        $ins = $db->prepare("INSERT INTO tema (materia_id, parcial_id, nombre, estado) VALUES (:m, :p, :n, :e)");
        $ins->execute([':m'=>$v['materia_id'], ':p'=>$v['parcial_id'], ':n'=>$v['nombre'], ':e'=>$v['estado']]);
        $cnt['inserted']++;
    }

    // -------------------------
    // Upload + request helpers
    // -------------------------
    private static function getUploadedFiles(string $key): array
    {
        if (!isset($_FILES[$key])) return [];

        $f = $_FILES[$key];

        // multiple: name[], tmp_name[]
        if (is_array($f['name'])) {
            $out = [];
            $count = count($f['name']);
            for ($i=0; $i<$count; $i++) {
                if (($f['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;
                $out[] = [
                    'name' => $f['name'][$i] ?? null,
                    'tmp_name' => $f['tmp_name'][$i] ?? null,
                    'size' => $f['size'][$i] ?? 0,
                    'type' => $f['type'][$i] ?? null,
                ];
            }
            return $out;
        }

        // single
        if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return [];
        return [[
            'name' => $f['name'] ?? null,
            'tmp_name' => $f['tmp_name'] ?? null,
            'size' => $f['size'] ?? 0,
            'type' => $f['type'] ?? null,
        ]];
    }

    private static function requirePost(): void
    {
        if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            throw new Exception('Método no permitido.');
        }
    }

    private static function isDateYmd(string $s): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) return false;
        [$y,$m,$d] = array_map('intval', explode('-', $s));
        return checkdate($m,$d,$y);
    }

    private static function toDdMmYyyyCompact(string $s): ?string
    {
        $s = trim($s);
        if ($s === '') return null;

        // Excel a veces manda número (fecha serial)
        if (is_numeric($s)) {
            try {
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float)$s);
                return $dt ? $dt->format('dmY') : null;
            } catch (\Throwable $e) {
                return null;
            }
        }

        // dd/mm/aaaa o dd-mm-aaaa
        if (preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', $s, $m)) {
            $d = (int)$m[1]; $mo = (int)$m[2]; $y = (int)$m[3];
            if (!checkdate($mo,$d,$y)) return null;
            return sprintf('%02d%02d%04d', $d, $mo, $y);
        }

        // aaaa-mm-dd
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m)) {
            $y=(int)$m[1]; $mo=(int)$m[2]; $d=(int)$m[3];
            if (!checkdate($mo,$d,$y)) return null;
            return sprintf('%02d%02d%04d', $d, $mo, $y);
        }

        return null;
    }

    private static function json(int $status, array $payload)
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        return null;
    }

    // -------------------------
    // Docentes helpers
    // -------------------------
    private static function upsertUsuarioDocente(PDO $db, array $v, array &$cnt): int
    {
        // upsert por matrícula (y si falla, por correo)
        $stmt = $db->prepare("SELECT id FROM usuario WHERE matricula = :m LIMIT 1");
        $stmt->execute([':m'=>$v['matricula']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $stmt2 = $db->prepare("SELECT id FROM usuario WHERE correo = :c LIMIT 1");
            $stmt2->execute([':c'=>$v['correo']]);
            $row = $stmt2->fetch(PDO::FETCH_ASSOC);
        }

        if ($row) {
            $id = (int)$row['id'];
            $u = $db->prepare("
                UPDATE usuario
                SET rol_id = :r,
                    nombre_completo = :n,
                    correo = :c,
                    matricula = :m,
                    password_hash = :p,
                    estado = :e
                WHERE id = :id
            ");
            $u->execute([
                ':r'=>$v['rol_id'],
                ':n'=>$v['nombre_completo'],
                ':c'=>$v['correo'],
                ':m'=>$v['matricula'],
                ':p'=>$v['password_hash'],
                ':e'=>$v['estado'],
                ':id'=>$id,
            ]);
            $cnt['updated']++;
            return $id;
        }

        $ins = $db->prepare("
            INSERT INTO usuario (rol_id, nombre_completo, correo, matricula, password_hash, estado)
            VALUES (:r, :n, :c, :m, :p, :e)
        ");
        $ins->execute([
            ':r'=>$v['rol_id'],
            ':n'=>$v['nombre_completo'],
            ':c'=>$v['correo'],
            ':m'=>$v['matricula'],
            ':p'=>$v['password_hash'],
            ':e'=>$v['estado'],
        ]);
        $cnt['inserted']++;
        return (int)$db->lastInsertId();
    }

    private static function upsertDocenteProfile(PDO $db, int $usuarioId, string $categoria, array &$cnt): void
    {
        $stmt = $db->prepare("SELECT 1 FROM docente_profile WHERE usuario_id = :u LIMIT 1");
        $stmt->execute([':u'=>$usuarioId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $u = $db->prepare("UPDATE docente_profile SET categoria = :c WHERE usuario_id = :u");
            $u->execute([':c'=>$categoria, ':u'=>$usuarioId]);
            $cnt['updated']++;
            return;
        }

        $ins = $db->prepare("INSERT INTO docente_profile (usuario_id, categoria) VALUES (:u, :c)");
        $ins->execute([':u'=>$usuarioId, ':c'=>$categoria]);
        $cnt['inserted']++;
    }

    private static function findAreaIdByNombre(PDO $db, string $nombre): int
    {
        $stmt = $db->prepare("SELECT id FROM area WHERE nombre = :n LIMIT 1");
        $stmt->execute([':n'=>$nombre]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['id'] : 0;
    }

    private static function upsertAreaDocenteTC(PDO $db, int $areaId, int $usuarioId, array &$cnt): void
    {
        // area_docente_tc tiene PK en area_id (1 docente TC por área)
        $stmt = $db->prepare("SELECT 1 FROM area_docente_tc WHERE area_id = :a LIMIT 1");
        $stmt->execute([':a'=>$areaId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $u = $db->prepare("UPDATE area_docente_tc SET usuario_id = :u WHERE area_id = :a");
            $u->execute([':u'=>$usuarioId, ':a'=>$areaId]);
            $cnt['updated']++;
            return;
        }

        $ins = $db->prepare("INSERT INTO area_docente_tc (area_id, usuario_id) VALUES (:a, :u)");
        $ins->execute([':a'=>$areaId, ':u'=>$usuarioId]);
        $cnt['inserted']++;
    }
}
