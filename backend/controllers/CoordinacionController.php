<?php
namespace Controllers;
use Model\CoordinadorProfile;
use Model\Periodo;
use Model\Carrera;
use MVC\Router;

class CoordinacionController {

    public static function getDashboard(Router $router, $codigo_periodo = null){
        try {
            if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
                http_response_code(405);
                exit;
            }

            $rolId = (int)($_SESSION['rol_id'] ?? 0);
            $coordId = (int)($_SESSION['id'] ?? 0);

            if ($rolId !== 2) {
                throw new \Exception("El usuario no es coordinador");
            }
            if (!$coordId) {
                throw new \Exception("Sesión inválida");
            }

            // 1) Perfil del coordinador
            $coordProfile = CoordinadorProfile::where('usuario_id', $coordId);
            if (!$coordProfile) {
                throw new \Exception("Perfil de coordinador no encontrado");
            }

            // 2) Área (nombre)
            $areaId = (int)($coordProfile->area_id ?? 0);
            $area = ['id' => $areaId, 'nombre' => null];

            if ($areaId) {
                // Usamos cualquier model con SQL; Carrera ya está importado.
                $areaRows = Carrera::SQL("
                    SELECT id, nombre
                    FROM area
                    WHERE id = {$areaId}
                    LIMIT 1
                ");
                if (!empty($areaRows)) {
                    $area = [
                        'id' => (int)($areaRows[0]->id ?? $areaId),
                        'nombre' => $areaRows[0]->nombre ?? null
                    ];
                }
            }

            // 3) Periodo actual
            $periodo = $codigo_periodo
                ? Periodo::findByCodigo($codigo_periodo)
                : Periodo::actual();

            if (!$periodo) {
                throw new \Exception("Periodo no encontrado");
            }

            $periodoPayload = [
                'id' => (int)($periodo->id ?? 0),
                'codigo' => $periodo->codigo ?? null,
                'nombre' => $periodo->nombre ?? null,
                'fecha_inicio' => $periodo->fecha_inicio ?? null,
                'fecha_fin' => $periodo->fecha_fin ?? null,
                'estado' => $periodo->estado ?? null,
            ];

            // 4) Carreras a su mando
            $carreras = Carrera::whereMany(
                'coordinador_id',
                $coordId,
                'ORDER BY nombre_carrera'
            );

            $careersBase = array_map(function($c){
                return [
                    'id' => (int)($c->id ?? 0),
                    'codigo_carrera' => $c->codigo_carrera ?? null,
                    'nombre_carrera' => $c->nombre_carrera ?? null,
                    'materias' => []
                ];
            }, $carreras);

            // Mapa base para asegurar que siempre regresen las carreras aunque no haya secciones
            $careerMap = [];
            foreach ($careersBase as $c) {
                $careerMap[$c['id']] = $c;
            }

            // Si no hay periodo activo, regresamos lo básico
            if (empty($carreras)) {
                $payload = [
                    'area' => $area,
                    'periodo' => $periodoPayload,
                    'carreras' => array_values($careerMap),
                    'stats' => [
                        'carreras' => count($careerMap),
                        'materias' => 0,
                        'secciones' => 0,
                        'alumnos' => 0,
                    ]
                ];

                echo json_encode(['code'=>200,'response'=>$payload], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $periodoId = (int)($periodo->id ?? 0);

            // 5) Query única para materias/secciones/alumnos del periodo actual
            $sql = "
                SELECT
                    ca.id AS carrera_id,
                    ca.nombre_carrera,
                    ca.codigo_carrera,

                    m.id AS materia_id,
                    m.nombre_materia,
                    m.codigo_materia,

                    cm.num_semestre,

                    s.id AS seccion_id,
                    s.grupo,
                    s.modalidad,
                    s.estado AS seccion_estado,
                    s.docente_id,

                    du.nombre_completo AS docente_nombre,

                    i.id AS inscripcion_id,
                    i.estudiante_id,

                    eu.nombre_completo AS estudiante_nombre,
                    eu.correo AS estudiante_correo,
                    eu.matricula AS estudiante_matricula

                FROM carrera ca
                JOIN seccion s
                    ON s.carrera_id = ca.id
                   AND s.periodo_id = {$periodoId}
                   AND s.estado = 'activa'

                JOIN materia m
                    ON m.id = s.materia_id

                LEFT JOIN carrera_materia cm
                    ON cm.carrera_id = ca.id
                   AND cm.materia_id = m.id
                   AND cm.estado = 'activa'

                LEFT JOIN usuario du
                    ON du.id = s.docente_id

                LEFT JOIN inscripcion i
                    ON i.seccion_id = s.id
                   AND i.estado = 'inscrito'

                LEFT JOIN usuario eu
                    ON eu.id = i.estudiante_id

                WHERE ca.coordinador_id = {$coordId}
                  AND ca.estado = 'activa'

                ORDER BY
                    ca.nombre_carrera,
                    cm.num_semestre,
                    m.nombre_materia,
                    s.grupo,
                    eu.nombre_completo
            ";

            $rows = Carrera::SQL($sql);

            // 6) Armado del árbol carreras -> materias -> secciones -> alumnos
            foreach ($rows as $r) {
                $cid = (int)($r->carrera_id ?? 0);
                if (!$cid) continue;

                // Asegurar carrera en mapa (por si acaso)
                if (!isset($careerMap[$cid])) {
                    $careerMap[$cid] = [
                        'id' => $cid,
                        'codigo_carrera' => $r->codigo_carrera ?? null,
                        'nombre_carrera' => $r->nombre_carrera ?? null,
                        'materias' => []
                    ];
                }

                // Materia
                $mid = (int)($r->materia_id ?? 0);
                if (!$mid) continue;

                if (!isset($careerMap[$cid]['_materiaMap'])) {
                    $careerMap[$cid]['_materiaMap'] = [];
                }

                if (!isset($careerMap[$cid]['_materiaMap'][$mid])) {
                    $careerMap[$cid]['_materiaMap'][$mid] = [
                        'id' => $mid,
                        'codigo_materia' => $r->codigo_materia ?? null,
                        'nombre_materia' => $r->nombre_materia ?? null,
                        'num_semestre' => isset($r->num_semestre) ? (int)$r->num_semestre : null,
                        'secciones' => [],
                        '_seccionMap' => []
                    ];
                }

                // Sección / grupo
                $sid = (int)($r->seccion_id ?? 0);
                if ($sid) {
                    $matRef = &$careerMap[$cid]['_materiaMap'][$mid];

                    if (!isset($matRef['_seccionMap'][$sid])) {
                        $matRef['_seccionMap'][$sid] = [
                            'id' => $sid,
                            'grupo' => $r->grupo ?? null,
                            'modalidad' => $r->modalidad ?? null,
                            'estado' => $r->seccion_estado ?? null,
                            'docente' => $r->docente_id ? [
                                'id' => (int)$r->docente_id,
                                'nombre_completo' => $r->docente_nombre ?? null
                            ] : null,
                            'alumnos' => []
                        ];
                    }

                    // Alumno (si existe inscripción)
                    $estId = (int)($r->estudiante_id ?? 0);
                    if ($estId) {
                        $matRef['_seccionMap'][$sid]['alumnos'][] = [
                            'id' => $estId,
                            'nombre_completo' => $r->estudiante_nombre ?? null,
                            'correo' => $r->estudiante_correo ?? null,
                            'matricula' => isset($r->estudiante_matricula) ? (string)$r->estudiante_matricula : null
                        ];
                    }
                }
            }

            // 7) Compactar mapas internos a arrays limpios
            $totalMaterias = 0;
            $totalSecciones = 0;
            $globalAlumnos = [];

            foreach ($careerMap as &$c) {
                $materiasArr = [];

                $materiaMap = $c['_materiaMap'] ?? [];
                foreach ($materiaMap as $m) {
                    $seccionesMap = $m['_seccionMap'] ?? [];
                    $seccionesArr = array_values($seccionesMap);

                    // Conteos globales
                    $totalSecciones += count($seccionesArr);

                    foreach ($seccionesArr as $sec) {
                        foreach ($sec['alumnos'] as $al) {
                            if (!empty($al['id'])) {
                                $globalAlumnos[$al['id']] = true;
                            }
                        }
                    }

                    unset($m['_seccionMap']);
                    $m['secciones'] = $seccionesArr;

                    $materiasArr[] = $m;
                }

                $totalMaterias += count($materiasArr);

                unset($c['_materiaMap']);
                $c['materias'] = $materiasArr;
            }
            unset($c);

            $payload = [
                'area' => $area,
                'periodo' => $periodoPayload,
                'carreras' => array_values($careerMap),
                'stats' => [
                    'carreras' => count($careerMap),
                    'materias' => $totalMaterias,
                    'secciones' => $totalSecciones,
                    'alumnos' => count($globalAlumnos),
                ]
            ];

            echo json_encode(['code'=>200,'response'=>$payload], JSON_UNESCAPED_UNICODE);
            exit;

        } catch(\Exception $e){
            http_response_code(400);
            echo json_encode(['code'=>400,'response'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    public static function getAlumnosArea(Router $router){
        try {
            if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') { http_response_code(405); exit; }

            $rolId   = (int)($_SESSION['rol_id'] ?? 0);
            $coordId = (int)($_SESSION['id'] ?? 0);

            if ($rolId !== 2) { throw new \Exception("El usuario no es coordinador"); }
            if (!$coordId) { throw new \Exception("Sesión inválida"); }

            $coordProfile = CoordinadorProfile::where('usuario_id', $coordId);
            if (!$coordProfile) { throw new \Exception("Perfil de coordinador no encontrado"); }

            $areaId = (int)($coordProfile->area_id ?? 0);
            $area = ['id' => $areaId, 'nombre' => null];

            if ($areaId) {
                $areaRows = Carrera::SQL("
                    SELECT id, nombre
                    FROM area
                    WHERE id = {$areaId}
                    LIMIT 1
                ");
                if (!empty($areaRows)) {
                    $area = [
                        'id' => (int)($areaRows[0]->id ?? $areaId),
                        'nombre' => $areaRows[0]->nombre ?? null
                    ];
                }
            }

            // 2) Carreras a su mando (base para que siempre regresen aunque no haya alumnos)
            $carreras = Carrera::whereMany(
                'coordinador_id',
                $coordId,
                'ORDER BY nombre_carrera'
            );

            $careerMap = [];
            foreach ($carreras as $c) {
                $cid = (int)($c->id ?? 0);
                if (!$cid) continue;

                $careerMap[$cid] = [
                    'id' => $cid,
                    'codigo_carrera' => $c->codigo_carrera ?? null,
                    'nombre_carrera' => $c->nombre_carrera ?? null,
                    'alumnos' => []
                ];
            }

            // Si no tiene carreras asignadas
            if (empty($careerMap)) {
                $payload = [
                    'area' => $area,
                    'carreras' => []
                ];
                echo json_encode(['code'=>200,'response'=>$payload], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // 3) Query única para alumnos de esas carreras
            // (cast a int arriba para minimizar riesgo de inyección)
            $sql = "
                SELECT
                    c.id AS carrera_id,
                    c.nombre_carrera,
                    c.codigo_carrera,

                    u.id AS alumno_id,
                    u.nombre_completo AS alumno_nombre,
                    u.correo AS alumno_correo,
                    u.matricula AS alumno_matricula,
                    u.estado AS alumno_estado

                FROM carrera c
                LEFT JOIN estudiante_profile ep
                    ON ep.carrera_id = c.id
                LEFT JOIN usuario u
                    ON u.id = ep.usuario_id
                AND u.rol_id = 5

                WHERE c.coordinador_id = {$coordId}
                AND c.estado = 'activa'

                ORDER BY
                    c.nombre_carrera,
                    u.nombre_completo
            ";

            $rows = Carrera::SQL($sql);

            // 4) Insertar alumnos en su carrera correspondiente
            foreach ($rows as $r) {
                $cid = (int)($r->carrera_id ?? 0);
                if (!$cid || !isset($careerMap[$cid])) continue;

                $alumnoId = (int)($r->alumno_id ?? 0);
                if (!$alumnoId) continue;

                // Si quieres, puedes filtrar por estado activo:
                // if (($r->alumno_estado ?? '') !== 'activo') continue;

                $careerMap[$cid]['alumnos'][] = [
                    'id' => $alumnoId,
                    'nombre_completo' => $r->alumno_nombre ?? null,
                    'correo' => $r->alumno_correo ?? null,
                    'matricula' => isset($r->alumno_matricula) ? (string)$r->alumno_matricula : null
                ];
            }

            $payload = [
                'area' => $area,
                'carreras' => array_values($careerMap),
                'stats' => [
                    'carreras' => count($careerMap),
                    'alumnos' => array_reduce($careerMap, function($acc, $c){
                        return $acc + count($c['alumnos'] ?? []);
                    }, 0)
                ]
            ];

            echo json_encode(['code'=>200,'response'=>$payload], JSON_UNESCAPED_UNICODE);
            exit;

        } catch(\Exception $e){
            http_response_code(400);
            echo json_encode(['code'=>400,'response'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    public static function getDocentesArea(Router $router, $codigo_periodo = null){
        try {
            if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
                http_response_code(405);
                exit;
            }

            $rolId   = (int)($_SESSION['rol_id'] ?? 0);
            $coordId = (int)($_SESSION['id'] ?? 0);

            if ($rolId !== 2) {
                throw new \Exception("El usuario no es coordinador");
            }
            if (!$coordId) {
                throw new \Exception("Sesión inválida");
            }

            // 1) Perfil del coordinador -> área
            $coordProfile = CoordinadorProfile::where('usuario_id', $coordId);
            if (!$coordProfile) {
                throw new \Exception("Perfil de coordinador no encontrado");
            }

            // 2) Área (nombre)
            $areaId = (int)($coordProfile->area_id ?? 0);
            $area = ['id' => $areaId, 'nombre' => null];

            if ($areaId) {
                $areaRows = Carrera::SQL("
                    SELECT id, nombre
                    FROM area
                    WHERE id = {$areaId}
                    LIMIT 1
                ");
                if (!empty($areaRows)) {
                    $area = [
                        'id' => (int)($areaRows[0]->id ?? $areaId),
                        'nombre' => $areaRows[0]->nombre ?? null
                    ];
                }
            }

            if (!$areaId) {
                throw new \Exception("Área no encontrada para el coordinador");
            }

            // 3) Periodo (si no mandan código, usamos el actual)
            $periodo = $codigo_periodo
                ? Periodo::findByCodigo($codigo_periodo)
                : Periodo::actual();

            if (!$periodo) {
                throw new \Exception("Periodo no encontrado");
            }

            $periodoId = (int)($periodo->id ?? 0);

            $periodoPayload = [
                'id' => $periodoId,
                'codigo' => $periodo->codigo ?? null,
                'nombre' => $periodo->nombre ?? null,
                'fecha_inicio' => $periodo->fecha_inicio ?? null,
                'fecha_fin' => $periodo->fecha_fin ?? null,
                'estado' => $periodo->estado ?? null,
            ];

            // 4) Query única: docentes que tengan secciones activas
            //     dentro de carreras del área del coordinador y del periodo elegido.
            $sql = "
                SELECT
                    du.id AS docente_id,
                    du.rol_id AS docente_rol_id,
                    du.nombre_completo AS docente_nombre,
                    du.correo AS docente_correo,
                    du.matricula AS docente_matricula,
                    du.estado AS docente_estado,

                    dp.categoria AS docente_categoria,

                    ca.id AS carrera_id,
                    ca.codigo_carrera,
                    ca.nombre_carrera,

                    s.id AS seccion_id,
                    s.grupo,
                    s.modalidad

                FROM seccion s
                JOIN carrera ca
                    ON ca.id = s.carrera_id
                AND ca.estado = 'activa'

                JOIN usuario du
                    ON du.id = s.docente_id
                AND du.rol_id IN (3,4)

                LEFT JOIN docente_profile dp
                    ON dp.usuario_id = du.id

                WHERE ca.area_id = {$areaId}
                AND s.periodo_id = {$periodoId}
                AND s.estado = 'activa'

                ORDER BY
                    du.nombre_completo,
                    ca.nombre_carrera,
                    s.grupo
            ";

            $rows = Carrera::SQL($sql);

            // 5) Armado de mapa de docentes (únicos) con info de apoyo
            $docenteMap = [];
            $globalSecciones = [];

            foreach ($rows as $r) {
                $did = (int)($r->docente_id ?? 0);
                if (!$did) continue;

                if (!isset($docenteMap[$did])) {
                    $docenteMap[$did] = [
                        'id' => $did,
                        'rol_id' => isset($r->docente_rol_id) ? (int)$r->docente_rol_id : null,
                        'categoria' => $r->docente_categoria ?? null,
                        'nombre_completo' => $r->docente_nombre ?? null,
                        'correo' => $r->docente_correo ?? null,
                        'matricula' => isset($r->docente_matricula) ? (string)$r->docente_matricula : null,
                        'estado' => $r->docente_estado ?? null,

                        // extras útiles para frontend
                        'carreras' => [],
                        '_careerSet' => [],
                        '_sectionSet' => []
                    ];
                }

                // carrera relacionada
                $cid = (int)($r->carrera_id ?? 0);
                if ($cid && empty($docenteMap[$did]['_careerSet'][$cid])) {
                    $docenteMap[$did]['_careerSet'][$cid] = true;
                    $docenteMap[$did]['carreras'][] = [
                        'id' => $cid,
                        'codigo_carrera' => $r->codigo_carrera ?? null,
                        'nombre_carrera' => $r->nombre_carrera ?? null,
                    ];
                }

                // sección relacionada (para conteo sin duplicados)
                $sid = (int)($r->seccion_id ?? 0);
                if ($sid && empty($docenteMap[$did]['_sectionSet'][$sid])) {
                    $docenteMap[$did]['_sectionSet'][$sid] = true;
                    $globalSecciones[$sid] = true;
                }
            }

            // 6) Compactar
            foreach ($docenteMap as &$d) {
                $d['total_clases_area'] = count($d['_sectionSet'] ?? []);
                unset($d['_careerSet'], $d['_sectionSet']);
            }
            unset($d);

            $payload = [
                'area' => $area,
                'periodo' => $periodoPayload,
                'docentes' => array_values($docenteMap),
                'stats' => [
                    'docentes' => count($docenteMap),
                    'secciones' => count($globalSecciones),
                ]
            ];

            echo json_encode(['code'=>200,'response'=>$payload], JSON_UNESCAPED_UNICODE);
            exit;

        } catch(\Exception $e){
            http_response_code(400);
            echo json_encode(['code'=>400,'response'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}
