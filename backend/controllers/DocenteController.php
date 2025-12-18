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

        if(!in_array($_SESSION['rol_id'], [2,3,4])){
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
            http_response_code(405); exit;
        }
        header('Content-Type: application/json; charset=utf-8');

        if(!in_array($_SESSION['rol_id'], [2,3,4])){
            http_response_code(403);
            echo json_encode(['ok' => false, 'response' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (in_array($_SESSION['rol_id'], [3,4])) {
            $docenteId = $_SESSION['id'];
        }elseif ($_SESSION['rol_id'] === 2) {
            $dsql="SELECT docente_id FROM seccion WHERE id = {$seccion_id} LIMIT 1";
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
                echo json_encode(['ok' => false, 'response' => 'Clase no encontrada']); exit;
            }
            echo json_encode([
                'ok' => true, 'docente_id' => $docenteId, 
                'clase' => ['seccion_id' => $seccionId, 'alumnos' => [], 'componentes' => []]
            ]); exit;
        }

        $base = $rows[0];

        // =================================================================================
        // 3. OBTENER ACTIVIDADES Y CALIFICACIONES (DETALLE)
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
            $comp = $act->componente; // 'blackboard', 'continua', 'examen'
            
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

        // C) Traemos calificaciones (El relleno)
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

        // =================================================================================
        // 4. CONSTRUCCIÓN DE RESPUESTA
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

        // Armado de Alumnos
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
                    'examen'     => isset($r->ex_parcial) ? (float)$r->ex_parcial : null,
                    'final'      => isset($r->final_parcial) ? (float)$r->final_parcial : null,
                ],
                
                // LA BITÁCORA DETALLADA
                'bitacora' => [] 
            ];

            // Inicializamos la estructura vacía basada en lo que sabemos que existe en la BD
            // para asegurar que el JSON venga completo incluso si el alumno no tiene nota en algo.
            foreach ($mapaEstructura as $parcialKey => $comps) {
                $alumnoData['bitacora'][$parcialKey] = [];
                
                foreach ($comps as $tipoComp => $acts) {
                    $items = [];
                    foreach ($acts as $actMeta) {
                        $actId = $actMeta['actividad_id'];
                        $nota = $califMap[$inscId][$actId] ?? null; // null si no tiene calificación

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

        echo json_encode([
            'ok' => true,
            'docente_id' => $docenteId,
            'clase' => [
                'seccion_id'     => (int)($base->seccion_id ?? 0),
                'periodo'        => $base->periodo_codigo ?? null,
                'materia' => [
                    'id' => (int)$base->materia_id, 'codigo' => $base->codigo_materia, 'nombre' => $base->nombre_materia,
                    'tipo_evaluacion' => $base->tipo_evaluacion 
                ],
                'carrera' => ['id' => (int)$base->carrera_id, 'codigo' => $base->codigo_carrera, 'nombre' => $base->nombre_carrera],
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
}
