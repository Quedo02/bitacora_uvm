<?php
namespace Controllers;

use MVC\Router;
use Model\ActiveRecord;
use Model\Periodo;

class DocenteController{
    public static function getClases(Router $router, $codigo_periodo = null){
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
            http_response_code(405);
            exit;
        }
        header('Content-Type: application/json; charset=utf-8');

        if(!in_array($_SESSION['id'], [2,3,4])){
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

    public static function getClaseDetalle(Router $router, $seccion_id = null){
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
            http_response_code(405);
            exit;
        }

        header('Content-Type: application/json; charset=utf-8');

        if(!in_array($_SESSION['id'], [2,3,4])){
            http_response_code(403);
            echo json_encode([
                'ok' => false,
                'code' => 403,
                'response' => 'No autorizado'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $docenteId = $_SESSION['id'];

        $seccionId = (int)($seccion_id ?? 0);
        if (!$seccionId) {
            http_response_code(400);
            echo json_encode([
                'ok' => false,
                'code' => 400,
                'response' => 'seccion_id inválido'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Traemos todo desde la vista
        $sql = "
            SELECT *
            FROM vw_docente_clases_alumnos
            WHERE docente_id = {$docenteId}
              AND seccion_id = {$seccionId}
              AND (inscripcion_estado = 'inscrito' OR inscripcion_estado IS NULL)
            ORDER BY estudiante_nombre
        ";

        $rows = ActiveRecord::SQL($sql);

        // Si no hay filas, validamos que la sección sí exista y pertenezca al docente
        if (!$rows || count($rows) === 0) {
            $check = ActiveRecord::SQL("
                SELECT s.id AS seccion_id
                FROM seccion s
                WHERE s.id = {$seccionId}
                  AND s.docente_id = {$docenteId}
                LIMIT 1
            ");

            if (!$check || count($check) === 0) {
                http_response_code(404);
                echo json_encode([
                    'ok' => false,
                    'code' => 404,
                    'response' => 'Clase no encontrada'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Existe pero sin alumnos inscritos
            echo json_encode([
                'ok' => true,
                'docente_id' => $docenteId,
                'clase' => [
                    'seccion_id' => $seccionId,
                    'alumnos' => [],
                    'componentes' => [],
                ]
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Construimos respuesta similar a getClases pero solo una sección
        $base = $rows[0];

        $clase = [
            'seccion_id' => (int)($base->seccion_id ?? 0),
            'periodo'    => $base->periodo_codigo ?? null,
            'materia' => [
                'id'     => (int)($base->materia_id ?? 0),
                'codigo' => $base->codigo_materia ?? null,
                'nombre' => $base->nombre_materia ?? null,
                'tipo_evaluacion' => $base->tipo_evaluacion ?? null,
            ],
            'carrera' => [
                'id'     => (int)($base->carrera_id ?? 0),
                'codigo' => $base->codigo_carrera ?? null,
                'nombre' => $base->nombre_carrera ?? null,
            ],
            'grupo'     => $base->grupo ?? null,
            'modalidad' => $base->modalidad ?? null,
            'seccion_estado' => $base->seccion_estado ?? null,

            'componentes' => [],
            'alumnos' => [],
        ];

        $componentes = [];
        $maybe = [
            'blackboard' => [
                'crn'  => $base->crn_blackboard ?? null,
                'peso' => isset($base->peso_blackboard_db) ? (float)$base->peso_blackboard_db : null,
            ],
            'continua' => [
                'crn'  => $base->crn_continua ?? null,
                'peso' => isset($base->peso_continua_db) ? (float)$base->peso_continua_db : null,
            ],
            'examen' => [
                'crn'  => $base->crn_examen ?? null,
                'peso' => isset($base->peso_examen_db) ? (float)$base->peso_examen_db : null,
            ],
        ];

        foreach ($maybe as $tipo => $data) {
            if ($data['crn']) {
                $componentes[] = [
                    'tipo' => $tipo,
                    'crn'  => $data['crn'],
                    'peso' => $data['peso'],
                ];
            }
        }

        usort($componentes, function ($a, $b) {
            $order = ['blackboard' => 1, 'continua' => 2, 'examen' => 3];
            return ($order[$a['tipo']] ?? 99) <=> ($order[$b['tipo']] ?? 99);
        });

        $clase['componentes'] = $componentes;

        $alumnosMap = [];
        foreach ($rows as $r) {
            $eid = (int)($r->estudiante_id ?? 0);
            if (!$eid || isset($alumnosMap[$eid])) continue;

            $inscId = (int)($r->inscripcion_id ?? 0);
            $alumnosMap[$eid] = [
                'id'             => $eid,
                'inscripcion_id' => $inscId,
                'nombre'         => $r->estudiante_nombre ?? null,
                'matricula'      => isset($r->estudiante_matricula) ? (int)$r->estudiante_matricula : null,
                'correo'         => $r->estudiante_correo ?? null,

                'calificaciones' => [
                    'blackboard' => isset($r->bb_calc) ? (float)$r->bb_calc : null,
                    'continua'   => isset($r->ec_calc) ? (float)$r->ec_calc : null,
                    'examen'     => isset($r->ex_parcial) ? (float)$r->ex_parcial : null,
                    'final'      => isset($r->final_parcial) ? (float)$r->final_parcial : null,
                ],
            ];
        }

        $clase['alumnos'] = array_values($alumnosMap);
        $clase['alumnos_count'] = count($clase['alumnos']);

        echo json_encode([
            'ok' => true,
            'docente_id' => $docenteId,
            'clase' => $clase,
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }
}
