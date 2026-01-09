<?php

namespace Controllers;

use MVC\Router;
use Model\ActiveRecord;
use Model\Periodo;

class DocenteController
{
    public static function getClases(Router $router, $codigo_periodo = null)
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
            http_response_code(405);
            exit;
        }
        header('Content-Type: application/json; charset=utf-8');

        if (!in_array($_SESSION['rol_id'], [2, 3, 4])) {
            http_response_code(403);
            echo json_encode([
                'ok' => false,
                'code' => 403,
                'response' => 'No autorizado'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $docenteId = $_SESSION['id'];

        $periodo = $codigo_periodo
            ? Periodo::findByCodigo($codigo_periodo)
            : Periodo::actual();

        if (!$periodo) {
            throw new \Exception("Periodo no encontrado");
        }

        $periodoFilter = " AND periodo_codigo = '{$periodo->codigo}' ";

        $sql = "
            SELECT *
            FROM vw_docente_clases_alumnos
            WHERE docente_id = {$docenteId}
              AND (inscripcion_estado = 'inscrito' OR inscripcion_estado IS NULL)
              {$periodoFilter}
            ORDER BY seccion_id, estudiante_nombre
        ";

        $rows = ActiveRecord::SQL($sql);

        $clases = [];

        foreach ($rows as $r) {
            $sid = (int)($r->seccion_id ?? 0);
            if (!$sid) continue;

            if (!isset($clases[$sid])) {
                $clases[$sid] = [
                    'seccion_id' => $sid,
                    'periodo'    => $r->periodo_codigo ?? null,
                    'materia' => [
                        'id'     => (int)($r->materia_id ?? 0),
                        'codigo' => $r->codigo_materia ?? null,
                        'nombre' => $r->nombre_materia ?? null,
                        'tipo_evaluacion' => $r->tipo_evaluacion ?? null,
                    ],
                    'carrera' => [
                        'id'     => (int)($r->carrera_id ?? 0),
                        'codigo' => $r->codigo_carrera ?? null,
                        'nombre' => $r->nombre_carrera ?? null,
                    ],
                    'grupo'     => $r->grupo ?? null,
                    'modalidad' => $r->modalidad ?? null,
                    'seccion_estado' => $r->seccion_estado ?? null,

                    '_componentes_map' => [],
                    '_alumnos_map'     => [],
                ];

                $maybe = [
                    'blackboard' => [
                        'crn'  => $r->crn_blackboard ?? null,
                        'peso' => isset($r->peso_blackboard_db) ? (float)$r->peso_blackboard_db : null,
                    ],
                    'continua' => [
                        'crn'  => $r->crn_continua ?? null,
                        'peso' => isset($r->peso_continua_db) ? (float)$r->peso_continua_db : null,
                    ],
                    'examen' => [
                        'crn'  => $r->crn_examen ?? null,
                        'peso' => isset($r->peso_examen_db) ? (float)$r->peso_examen_db : null,
                    ],
                ];

                foreach ($maybe as $tipo => $data) {
                    if ($data['crn']) {
                        $clases[$sid]['_componentes_map'][$tipo] = [
                            'tipo' => $tipo,
                            'crn'  => $data['crn'],
                            'peso' => $data['peso'],
                        ];
                    }
                }
            }

            // Alumnos (si existen)
            $eid = (int)($r->estudiante_id ?? 0);
            if ($eid && !isset($clases[$sid]['_alumnos_map'][$eid])) {
                $clases[$sid]['_alumnos_map'][$eid] = [
                    'id'        => $eid,
                    'nombre'    => $r->estudiante_nombre ?? null,
                    'matricula' => isset($r->estudiante_matricula) ? (int)$r->estudiante_matricula : null,
                    'correo'    => $r->estudiante_correo ?? null,
                ];
            }
        }

        // Normalizar salida
        foreach ($clases as &$clase) {
            $componentes = array_values($clase['_componentes_map']);
            $alumnos     = array_values($clase['_alumnos_map']);

            unset($clase['_componentes_map'], $clase['_alumnos_map']);

            usort($componentes, function ($a, $b) {
                $order = ['blackboard' => 1, 'continua' => 2, 'examen' => 3];
                return ($order[$a['tipo']] ?? 99) <=> ($order[$b['tipo']] ?? 99);
            });

            $clase['componentes'] = $componentes;
            $clase['alumnos']     = $alumnos;
            $clase['alumnos_count'] = count($alumnos);
        }
        unset($clase);

        echo json_encode([
            'ok' => true,
            'docente_id' => $docenteId,
            'clases' => array_values($clases),
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    public static function getClaseDetalle(Router $router, $seccion_id = null)
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
            http_response_code(405);
            exit;
        }
        header('Content-Type: application/json; charset=utf-8');

        if (!in_array($_SESSION['rol_id'], [2, 3, 4])) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'response' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (in_array($_SESSION['rol_id'], [3, 4])) {
            $docenteId = $_SESSION['id'];
        } elseif ($_SESSION['rol_id'] === 2) {
            $dsql = "SELECT docente_id FROM seccion WHERE id = {$seccion_id} LIMIT 1";
            $res = ActiveRecord::SQL($dsql);
            $docenteId = isset($res[0]->docente_id) ? (int)$res[0]->docente_id : 0;
        }

        $seccionId = (int)($seccion_id ?? 0);

        if (!$seccionId) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'response' => 'seccion_id inválido'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // 2. Traer info base de la clase (usando tu vista existente)
        $sql = "
        SELECT *
        FROM vw_docente_clases_alumnos
        WHERE docente_id = {$docenteId}
        AND seccion_id = {$seccionId}
        AND (inscripcion_estado = 'inscrito' OR inscripcion_estado IS NULL)
        ORDER BY estudiante_nombre
    ";
        $rows = ActiveRecord::SQL($sql);

        // Validación si la clase existe pero está vacía
        if (!$rows || count($rows) === 0) {
            $check = ActiveRecord::SQL("SELECT id FROM seccion WHERE id = {$seccionId} AND docente_id = {$docenteId} LIMIT 1");
            if (!$check) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'response' => 'Clase no encontrada']);
                exit;
            }
            echo json_encode([
                'ok' => true,
                'docente_id' => $docenteId,
                'clase' => ['seccion_id' => $seccionId, 'alumnos' => [], 'componentes' => []]
            ]);
            exit;
        }

        $base = $rows[0];

        // =================================================================================
        // 3. OBTENER ACTIVIDADES Y CALIFICACIONES (DETALLE) - CORREGIDO
        // =================================================================================

        // A) Traemos todas las actividades de esta sección
        $sqlActividades = "
        SELECT id, parcial_id, componente, nombre, peso_en_componente 
        FROM actividad 
        WHERE seccion_id = {$seccionId}
        ORDER BY parcial_id ASC, componente ASC, id ASC
    ";
        $actividadesDB = ActiveRecord::SQL($sqlActividades);

        // B) Creamos dos mapas:
        //    1. $mapaEstructura: Para decirle al frontend qué columnas existen (Metadata)
        //    2. $infoActividades: Para buscar rápido el nombre/peso al iterar alumnos
        $mapaEstructura = [];
        $infoActividades = [];

        foreach ($actividadesDB as $act) {
            // Generamos la llave descriptiva "Parcial 1", "Parcial 2"
            $keyParcial = "Parcial " . $act->parcial_id;
            $comp = $act->componente; // 'blackboard', 'continua'

            // Estructura para el frontend (definición de columnas)
            if (!isset($mapaEstructura[$keyParcial])) $mapaEstructura[$keyParcial] = [];
            if (!isset($mapaEstructura[$keyParcial][$comp])) $mapaEstructura[$keyParcial][$comp] = [];

            $mapaEstructura[$keyParcial][$comp][] = [
                'actividad_id' => $act->id,
                'nombre_actividad' => $act->nombre,
                'peso_actividad' => (float)$act->peso_en_componente
            ];

            // Diccionario rápido para usar abajo al armar alumnos
            $infoActividades[$act->id] = [
                'nombre' => $act->nombre,
                'peso' => (float)$act->peso_en_componente,
                'parcial_label' => $keyParcial,
                'componente' => $comp
            ];
        }

        // ⭐ AGREGADO: Estructura para componente EXAMEN (no tiene actividades individuales)
        foreach ([1, 2, 3] as $parcialNum) {
            $keyParcial = "Parcial " . $parcialNum;
            if (!isset($mapaEstructura[$keyParcial])) $mapaEstructura[$keyParcial] = [];
            // El componente 'examen' siempre existe pero no tiene actividades individuales
            $mapaEstructura[$keyParcial]['examen'] = [];
        }

        // C) Traemos calificaciones de ACTIVIDADES (Blackboard y Continua)
        $sqlCalif = "
        SELECT ca.inscripcion_id, ca.actividad_id, ca.calificacion
        FROM calificacion_actividad ca
        JOIN actividad a ON a.id = ca.actividad_id
        WHERE a.seccion_id = {$seccionId}
    ";
        $calificacionesDB = ActiveRecord::SQL($sqlCalif);

        // Indexamos calificaciones: [inscripcion_id][actividad_id] = 9.5
        $califMap = [];
        foreach ($calificacionesDB as $c) {
            $califMap[$c->inscripcion_id][$c->actividad_id] = (float)$c->calificacion;
        }

        // ⭐ NUEVO: D) Traemos calificaciones de EXÁMENES PARCIALES por inscripción y parcial
        $sqlExamenes = "
        SELECT 
            ei.inscripcion_id,
            e.parcial_id,
            AVG(COALESCE(ei.calif_final, ei.calif_auto, 0)) AS calificacion_examen
        FROM examen_intento ei
        JOIN examen e ON e.id = ei.examen_id
        WHERE e.seccion_id = {$seccionId}
          AND e.tipo = 'parcial'
          AND ei.estado IN ('enviado', 'revisado')
        GROUP BY ei.inscripcion_id, e.parcial_id
    ";
        $examenesDB = ActiveRecord::SQL($sqlExamenes);

        // Indexamos calificaciones de examen: [inscripcion_id][parcial_id] = 8.5
        $examenMap = [];
        foreach ($examenesDB as $ex) {
            $examenMap[$ex->inscripcion_id][$ex->parcial_id] = (float)$ex->calificacion_examen;
        }

        // =================================================================================
        // 4. CONSTRUCCIÓN DE RESPUESTA - ACTUALIZADA
        // =================================================================================

        // Componentes generales (Ponderación Global del Curso)
        $componentes = [];
        $maybe = [
            'blackboard' => ['crn' => $base->crn_blackboard ?? null, 'peso' => isset($base->peso_blackboard_db) ? (float)$base->peso_blackboard_db : null],
            'continua'   => ['crn' => $base->crn_continua ?? null,   'peso' => isset($base->peso_continua_db) ? (float)$base->peso_continua_db : null],
            'examen'     => ['crn' => $base->crn_examen ?? null,     'peso' => isset($base->peso_examen_db) ? (float)$base->peso_examen_db : null],
        ];
        foreach ($maybe as $tipo => $data) {
            if ($data['crn']) $componentes[] = ['tipo' => $tipo, 'crn' => $data['crn'], 'peso' => $data['peso']];
        }
        // Ordenar
        usort($componentes, function ($a, $b) {
            $order = ['blackboard' => 1, 'continua' => 2, 'examen' => 3];
            return ($order[$a['tipo']] ?? 99) <=> ($order[$b['tipo']] ?? 99);
        });

        // Armado de Alumnos - ACTUALIZADO
        $alumnosMap = [];
        foreach ($rows as $r) {
            $eid = (int)($r->estudiante_id ?? 0);
            if (!$eid || isset($alumnosMap[$eid])) continue;

            $inscId = (int)($r->inscripcion_id ?? 0);

            $alumnoData = [
                'id'             => $eid,
                'inscripcion_id' => $inscId,
                'nombre'         => $r->estudiante_nombre ?? null,
                'matricula'      => isset($r->estudiante_matricula) ? (int)$r->estudiante_matricula : null,
                'correo'         => $r->estudiante_correo ?? null,

                // Promedios calculados por Vista (Histórico/Resumen)
                'resumen_calificaciones' => [
                    'blackboard' => isset($r->bb_calc) ? (float)$r->bb_calc : null,
                    'continua'   => isset($r->ec_calc) ? (float)$r->ec_calc : null,
                    // ⭐ CORREGIDO: Promedio de TODOS los exámenes parciales
                    'examen'     => isset($examenMap[$inscId])
                        ? round(array_sum($examenMap[$inscId]) / count($examenMap[$inscId]), 2)
                        : null,
                    'final'      => isset($r->final_parcial) ? (float)$r->final_parcial : null,
                ],

                // LA BITÁCORA DETALLADA
                'bitacora' => []
            ];

            // Inicializamos la estructura vacía basada en lo que sabemos que existe
            foreach ($mapaEstructura as $parcialKey => $comps) {
                $alumnoData['bitacora'][$parcialKey] = [];

                // Extraer número de parcial (de "Parcial 1" -> 1)
                $parcialNum = (int)str_replace('Parcial ', '', $parcialKey);

                foreach ($comps as $tipoComp => $acts) {
                    // ⭐ CASO ESPECIAL: Componente EXAMEN
                    if ($tipoComp === 'examen') {
                        $califExamen = $examenMap[$inscId][$parcialNum] ?? null;

                        // Formato especial para examen (sin actividades individuales)
                        $alumnoData['bitacora'][$parcialKey]['examen'] = [
                            [
                                'actividad_id'        => null,
                                'nombre_actividad'    => "Examen Parcial {$parcialNum}",
                                'peso_actividad'      => 100.0, // El examen es 100% de su componente
                                'calificacion_alumno' => $califExamen
                            ]
                        ];
                        continue;
                    }

                    // CASO NORMAL: Blackboard o Continua (con actividades)
                    $items = [];
                    foreach ($acts as $actMeta) {
                        $actId = $actMeta['actividad_id'];
                        $nota = $califMap[$inscId][$actId] ?? null;

                        $items[] = [
                            'actividad_id'        => $actId,
                            'nombre_actividad'    => $actMeta['nombre_actividad'],
                            'peso_actividad'      => $actMeta['peso_actividad'],
                            'calificacion_alumno' => $nota
                        ];
                    }
                    $alumnoData['bitacora'][$parcialKey][$tipoComp] = $items;
                }
            }

            $alumnosMap[$eid] = $alumnoData;
        }

        // Respuesta final
        echo json_encode([
            'ok' => true,
            'docente_id' => $docenteId,
            'clase' => [
                'seccion_id'     => (int)($base->seccion_id ?? 0),
                'periodo'        => $base->periodo_codigo ?? null,
                'materia' => [
                    'id' => (int)$base->materia_id,
                    'codigo' => $base->codigo_materia,
                    'nombre' => $base->nombre_materia,
                    'tipo_evaluacion' => $base->tipo_evaluacion
                ],
                'carrera' => [
                    'id' => (int)$base->carrera_id,
                    'codigo' => $base->codigo_carrera,
                    'nombre' => $base->nombre_carrera
                ],
                'grupo'          => $base->grupo,
                'modalidad'      => $base->modalidad,
                'seccion_estado' => $base->seccion_estado,
                'componentes'    => $componentes,

                // ESTO ES CLAVE: Metadata para que tu frontend sepa armar las tablas
                'estructura_bitacora' => $mapaEstructura,

                'alumnos'        => array_values($alumnosMap),
                'alumnos_count'  => count($alumnosMap)
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }


    public static function importBitacora(Router $router, $seccion_id = null)
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            http_response_code(405);
            exit;
        }
        header('Content-Type: application/json; charset=utf-8');

        if (!in_array($_SESSION['rol_id'], [2, 3, 4])) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'response' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $seccionId = (int)($seccion_id ?? 0);
        if (!$seccionId) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'response' => 'seccion_id inválido'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Resolver docenteId (igual que en getClaseDetalle)
        if (in_array($_SESSION['rol_id'], [3, 4])) {
            $docenteId = (int)$_SESSION['id'];
        } else { // coordinador
            $dsql = "SELECT docente_id FROM seccion WHERE id = {$seccionId} LIMIT 1";
            $res = ActiveRecord::SQL($dsql);
            $docenteId = isset($res[0]->docente_id) ? (int)$res[0]->docente_id : 0;
        }

        // Validar que la sección pertenezca al docente (o exista bajo ese docente)
        $check = ActiveRecord::SQL("SELECT id FROM seccion WHERE id = {$seccionId} AND docente_id = {$docenteId} LIMIT 1");
        if (!$check) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'response' => 'Clase no encontrada'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $parcialId = (int)($input['parcial_id'] ?? 0);
        $componente = trim((string)($input['componente'] ?? ''));
        $origen = trim((string)($input['origen'] ?? 'manual'));
        $actividades = $input['actividades'] ?? [];
        $filas = $input['filas'] ?? [];

        if (!in_array($parcialId, [1, 2, 3, 4], true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'response' => 'parcial_id inválido'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        if (!in_array($componente, ['blackboard', 'continua'], true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'response' => 'componente inválido'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        if (!in_array($origen, ['blackboard', 'teams', 'manual'], true)) {
            $origen = 'manual';
        }
        if (!is_array($actividades) || count($actividades) === 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'response' => 'Faltan actividades'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Helpers
        $esc = function ($s) {
            return addslashes((string)$s);
        };
        $toFloat = function ($v) {
            if ($v === null || $v === '') return null;
            if (is_numeric($v)) return (float)$v;
            return null;
        };

        try {
            ActiveRecord::SQL("START TRANSACTION");

            // 1) Upsert de actividades (dentro del componente)
            $actividadIds = []; // en el mismo orden que el input
            $upserted = 0;

            foreach ($actividades as $a) {
                $nombre = trim((string)($a['nombre'] ?? ''));
                if ($nombre === '') continue;

                $peso = $toFloat($a['peso_en_componente'] ?? null);
                if ($peso === null) $peso = 0.0;
                // Clamp razonable
                if ($peso < 0) $peso = 0.0;
                if ($peso > 100) $peso = 100.0;
                $peso = round($peso, 2);

                $ref = isset($a['referencia_externa']) ? trim((string)$a['referencia_externa']) : null;
                if ($ref === '') $ref = null;

                $nombreSql = $esc($nombre);
                $refSql = $ref !== null ? ("'" . $esc($ref) . "'") : "NULL";
                $pesoSql = number_format($peso, 2, '.', '');

                // ON DUPLICATE KEY UPDATE sobre ux_act_unique (seccion_id, parcial_id, componente, nombre)
                $sqlUpsert = "
                INSERT INTO actividad (seccion_id, parcial_id, componente, origen, nombre, peso_en_componente, referencia_externa, estado)
                VALUES ({$seccionId}, {$parcialId}, '{$componente}', '{$origen}', '{$nombreSql}', {$pesoSql}, {$refSql}, 'activa')
                ON DUPLICATE KEY UPDATE
                    origen = VALUES(origen),
                    peso_en_componente = VALUES(peso_en_componente),
                    referencia_externa = VALUES(referencia_externa),
                    estado = 'activa',
                    updated_at = NOW()
            ";
                ActiveRecord::SQL($sqlUpsert);

                $row = ActiveRecord::SQL("
                SELECT id
                FROM actividad
                WHERE seccion_id = {$seccionId}
                  AND parcial_id = {$parcialId}
                  AND componente = '{$componente}'
                  AND nombre = '{$nombreSql}'
                LIMIT 1
            ");
                if ($row && isset($row[0]->id)) {
                    $actividadIds[] = (int)$row[0]->id;
                    $upserted++;
                }
            }

            if (count($actividadIds) === 0) {
                ActiveRecord::SQL("ROLLBACK");
                http_response_code(400);
                echo json_encode(['ok' => false, 'response' => 'No se pudo crear/actualizar ninguna actividad'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // 2) Mapa de inscripciones para hacer match por matrícula/correo
            $inscRows = ActiveRecord::SQL("
            SELECT i.id AS inscripcion_id, u.matricula, u.correo
            FROM inscripcion i
            JOIN usuario u ON u.id = i.estudiante_id
            WHERE i.seccion_id = {$seccionId}
              AND i.estado = 'inscrito'
              AND u.rol_id = 5
        ");

            $inscMap = [];
            foreach ($inscRows as $r) {
                $inscId = (int)($r->inscripcion_id ?? 0);
                if (!$inscId) continue;

                $mat = trim((string)($r->matricula ?? ''));
                $correo = mb_strtolower(trim((string)($r->correo ?? '')));

                if ($mat !== '') {
                    $inscMap[$mat] = $inscId;
                    $inscMap[mb_strtolower($mat . '@uvm.edu.mx')] = $inscId;
                    $inscMap[mb_strtolower($mat . '@uvm.edu')] = $inscId;
                }
                if ($correo !== '') {
                    $inscMap[$correo] = $inscId;
                    $at = strpos($correo, '@');
                    if ($at !== false) {
                        $local = substr($correo, 0, $at);
                        if ($local !== '') $inscMap[$local] = $inscId;

                        // Variantes comunes entre prod y test
                        if (str_ends_with($correo, '@uvm.edu.mx')) {
                            $inscMap[$local . '@uvm.edu'] = $inscId;
                        } elseif (str_ends_with($correo, '@uvm.edu')) {
                            $inscMap[$local . '@uvm.edu.mx'] = $inscId;
                        }
                    }
                }
            }

            // 3) Upsert de calificaciones (solo si viene número; NO sobreescribir con null)
            $inserted = 0;
            $skippedNoMatch = 0;
            $noMatchSamples = [];

            if (is_array($filas) && count($filas) > 0) {
                foreach ($filas as $fila) {
                    $ident = mb_strtolower(trim((string)($fila['identificador'] ?? '')));
                    if ($ident === '') continue;

                    $inscId = $inscMap[$ident] ?? null;
                    if (!$inscId && strpos($ident, '@') !== false) {
                        $local = explode('@', $ident)[0] ?? '';
                        if ($local !== '') $inscId = $inscMap[$local] ?? null;
                    }
                    if (!$inscId) {
                        $skippedNoMatch++;
                        if (count($noMatchSamples) < 10) $noMatchSamples[] = $ident;
                        continue;
                    }

                    $cals = $fila['calificaciones'] ?? [];
                    if (!is_array($cals)) $cals = [];

                    for ($i = 0; $i < count($actividadIds); $i++) {
                        $actId = (int)$actividadIds[$i];
                        $raw = $cals[$i] ?? null;

                        if ($raw === '' || $raw === null) continue;
                        if (!is_numeric($raw)) continue;

                        $cal = round((float)$raw, 2);
                        if ($cal < 0) $cal = 0;
                        if ($cal > 10) $cal = 10;

                        $calSql = number_format($cal, 2, '.', '');

                        $sqlCal = "
                        INSERT INTO calificacion_actividad (actividad_id, inscripcion_id, calificacion)
                        VALUES ({$actId}, {$inscId}, {$calSql})
                        ON DUPLICATE KEY UPDATE
                            calificacion = VALUES(calificacion),
                            updated_at = NOW()
                    ";
                        ActiveRecord::SQL($sqlCal);
                        $inserted++;
                    }
                }
            }

            ActiveRecord::SQL("COMMIT");

            echo json_encode([
                'ok' => true,
                'seccion_id' => $seccionId,
                'parcial_id' => $parcialId,
                'componente' => $componente,
                'origen' => $origen,
                'actividades_upserted' => $upserted,
                'calificaciones_upserted' => $inserted,
                'alumnos_sin_match' => $skippedNoMatch,
                'alumnos_sin_match_samples' => $noMatchSamples,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (\Throwable $e) {
            try {
                ActiveRecord::SQL("ROLLBACK");
            } catch (\Throwable $ignore) {
            }

            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'response' => 'Error al importar bitácora',
                'detail' => $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    public static function updateBitacora(Router $router, $seccion_id = null)
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            http_response_code(405);
            exit;
        }
        header('Content-Type: application/json; charset=utf-8');

        if (!in_array($_SESSION['rol_id'], [2, 3, 4])) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'response' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $seccionId = (int)($seccion_id ?? 0);
        if (!$seccionId) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'response' => 'seccion_id inválido'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Resolver docenteId
        if (in_array($_SESSION['rol_id'], [3, 4])) {
            $docenteId = (int)$_SESSION['id'];
        } else {
            $dsql = "SELECT docente_id FROM seccion WHERE id = {$seccionId} LIMIT 1";
            $res = ActiveRecord::SQL($dsql);
            $docenteId = isset($res[0]->docente_id) ? (int)$res[0]->docente_id : 0;
        }

        // Validar que la sección pertenezca al docente
        $check = ActiveRecord::SQL("SELECT id FROM seccion WHERE id = {$seccionId} AND docente_id = {$docenteId} LIMIT 1");
        if (!$check) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'response' => 'Clase no encontrada'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $calificaciones = $input['calificaciones'] ?? [];

        if (!is_array($calificaciones) || count($calificaciones) === 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'response' => 'No hay calificaciones para actualizar'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $toFloat = function ($v) {
            if ($v === null || $v === '') return null;
            $v = str_replace(',', '.', (string)$v);
            if (!is_numeric($v)) return null;
            $n = (float)$v;
            if ($n < 0) $n = 0;
            if ($n > 10) $n = 10;
            return round($n, 2);
        };

        try {
            ActiveRecord::SQL("START TRANSACTION");

            $updated = 0;
            $errors = [];

            foreach ($calificaciones as $item) {
                $inscripcionId = (int)($item['inscripcion_id'] ?? 0);
                $actividadId = (int)($item['actividad_id'] ?? 0);
                $calificacion = $toFloat($item['calificacion'] ?? null);

                if (!$inscripcionId || !$actividadId) {
                    $errors[] = "Datos incompletos";
                    continue;
                }

                // Verificar que la actividad pertenece a esta sección
                $actCheck = ActiveRecord::SQL("
                SELECT id FROM actividad 
                WHERE id = {$actividadId} AND seccion_id = {$seccionId}
                LIMIT 1
            ");
                if (!$actCheck) {
                    $errors[] = "Actividad {$actividadId} no pertenece a esta sección";
                    continue;
                }

                // Verificar que la inscripción pertenece a esta sección
                $inscCheck = ActiveRecord::SQL("
                SELECT id FROM inscripcion 
                WHERE id = {$inscripcionId} AND seccion_id = {$seccionId}
                LIMIT 1
            ");
                if (!$inscCheck) {
                    $errors[] = "Inscripción {$inscripcionId} no pertenece a esta sección";
                    continue;
                }

                if ($calificacion === null) {
                    // Si viene vacío, eliminar la calificación existente
                    ActiveRecord::SQL("
                    DELETE FROM calificacion_actividad 
                    WHERE actividad_id = {$actividadId} AND inscripcion_id = {$inscripcionId}
                ");
                } else {
                    // Upsert de la calificación
                    $calSql = number_format($calificacion, 2, '.', '');
                    ActiveRecord::SQL("
                    INSERT INTO calificacion_actividad (actividad_id, inscripcion_id, calificacion)
                    VALUES ({$actividadId}, {$inscripcionId}, {$calSql})
                    ON DUPLICATE KEY UPDATE
                        calificacion = VALUES(calificacion),
                        updated_at = NOW()
                ");
                }

                $updated++;
            }

            ActiveRecord::SQL("COMMIT");

            echo json_encode([
                'ok' => true,
                'updated' => $updated,
                'errors' => $errors,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (\Throwable $e) {
            try {
                ActiveRecord::SQL("ROLLBACK");
            } catch (\Throwable $ignore) {
            }

            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'response' => 'Error al actualizar calificaciones',
                'detail' => $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}
