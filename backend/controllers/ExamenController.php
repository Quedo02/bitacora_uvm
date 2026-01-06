<?php

namespace Controllers;

use MVC\Router;
use Model\Periodo;
use Model\Seccion;
use Model\Inscripcion;
use Model\Examen;
use Model\ExamenPregunta;
use Model\ExamenIntento;
use Model\ExamenIntentoPregunta;
use Model\ExamenRespuesta;
use Model\PreguntaVersion;
use Model\Pregunta;
use Model\MateriaArea;
use Model\CoordinadorProfile;

class ExamenController
{

    private static function json(int $code, $payload = null): void
    {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($code);
        if ($payload === null) {
            echo json_encode(['code' => $code], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(['code' => $code, 'response' => $payload], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    private static function requireMethod(string $method): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
            http_response_code(405);
            exit;
        }
    }

    private static function body(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '[]', true);
        return is_array($data) ? $data : [];
    }

    private static function rol(): int
    {
        return (int)($_SESSION['rol_id'] ?? 0);
    }
    private static function uid(): int
    {
        return (int)($_SESSION['id'] ?? 0);
    }
    private static function isAdmin(): bool
    {
        return self::rol() === 1;
    }
    private static function isCoord(): bool
    {
        return self::rol() === 2;
    }
    private static function isDocente(): bool
    {
        return in_array(self::rol(), [3, 4], true);
    }
    private static function isAlumno(): bool
    {
        return self::rol() === 5;
    }

    private static function coordAreaId(int $userId): ?int
    {
        $cp = CoordinadorProfile::where('usuario_id', $userId);
        return $cp ? (int)$cp->area_id : null;
    }

    private static function docenteEsDeSeccion(int $docenteId, int $seccionId): bool
    {
        $s = Seccion::find($seccionId);
        if (!$s) return false;
        return (int)$s->docente_id === (int)$docenteId;
    }

    private static function alumnoInscritoEnSeccion(int $alumnoId, int $seccionId): ?int
    {
        $rows = Inscripcion::SQL("SELECT id FROM inscripcion WHERE seccion_id = " . (int)$seccionId . " AND estudiante_id = " . (int)$alumnoId . " AND estado='inscrito' LIMIT 1");
        if (empty($rows)) return null;
        return (int)$rows[0]->id;
    }

    // =========================
    //  GET /api/examenes/seccion/{seccion_id}
    // =========================
    public static function getExamenesSeccion(Router $router, $seccion_id): void
    {
        try {
            self::requireMethod('GET');

            $sid = (int)$seccion_id;
            if ($sid <= 0) self::json(400, 'seccion_id inválido');

            $rol = self::rol();
            if (!in_array($rol, [1, 2, 3, 4], true)) self::json(403, 'No autorizado');

            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), $sid)) self::json(403, 'No autorizado');
            }

            $rows = Examen::SQL("SELECT * FROM examen WHERE seccion_id = {$sid} ORDER BY fecha_inicio DESC");
            self::json(200, $rows);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/examenes/seccion/{seccion_id}
    // =========================
    public static function createExamen(Router $router, $seccion_id): void
    {
        try {
            self::requireMethod('POST');

            $sid = (int)$seccion_id;
            if ($sid <= 0) self::json(400, 'seccion_id inválido');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');

            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), $sid)) self::json(403, 'No autorizado');
            }

            $s = Seccion::find($sid);
            if (!$s) self::json(404, 'Sección no encontrada');

            $data = self::body();

            $tipo = (string)($data['tipo'] ?? 'parcial');
            $parcialId = isset($data['parcial_id']) ? (int)$data['parcial_id'] : null;

            $fechaInicio = (string)($data['fecha_inicio'] ?? '');
            $durMin = (int)($data['duracion_min'] ?? 60);
            $intentos = (int)($data['intentos_max'] ?? 1);

            $modo = (string)($data['modo_armado'] ?? 'random');
            $num = (int)($data['num_preguntas'] ?? 10);
            $difMin = (int)($data['dificultad_min'] ?? 1);
            $difMax = (int)($data['dificultad_max'] ?? 10);

            $mezclarPreg = (int)($data['mezclar_preguntas'] ?? 1);
            $mezclarOpc = (int)($data['mezclar_opciones'] ?? 1);

            if ($fechaInicio === '') self::json(400, 'fecha_inicio requerido');
            if ($durMin <= 0) $durMin = 60;
            if ($intentos <= 0) $intentos = 1;
            if ($num <= 0) $num = 10;
            $difMin = max(1, min(10, $difMin));
            $difMax = max(1, min(10, $difMax));

            $ex = new Examen([
                'seccion_id' => $sid,
                'materia_id' => (int)$s->materia_id,
                'creado_por' => self::uid(),
                'tipo' => $tipo,
                'parcial_id' => $parcialId,
                'fecha_inicio' => $fechaInicio,
                'duracion_min' => $durMin,
                'intentos_max' => $intentos,
                'modo_armado' => $modo,
                'num_preguntas' => $num,
                'dificultad_min' => $difMin,
                'dificultad_max' => $difMax,
                'mezclar_preguntas' => $mezclarPreg,
                'mezclar_opciones' => $mezclarOpc,
                'estado' => 'borrador'
            ]);

            $res = $ex->crear();
            if (!($res['resultado'] ?? false)) self::json(400, 'No se pudo crear examen');
            self::json(201, $res);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  GET /api/examenes/examen/{examen_id}
    // =========================
    public static function getExamenDetalle(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('GET');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $ex = Examen::find($eid);
            if (!$ex) self::json(404, 'Examen no encontrado');

            $rol = self::rol();

            // permisos
            if (self::isAdmin()) {
                // ok
            } elseif (self::isDocente()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$ex->seccion_id)) self::json(403, 'No autorizado');
            } elseif (self::isCoord()) {
                $areaId = self::coordAreaId(self::uid());
                if (!$areaId) self::json(403, 'No autorizado');
                $ok = MateriaArea::SQL("SELECT 1 FROM materia_area WHERE materia_id = " . (int)$ex->materia_id . " AND area_id = " . (int)$areaId . " AND estado='activa' LIMIT 1");
                if (empty($ok)) self::json(403, 'No autorizado');
            } elseif (self::isAlumno()) {
                $inscId = self::alumnoInscritoEnSeccion(self::uid(), (int)$ex->seccion_id);
                if (!$inscId) self::json(403, 'No autorizado');
            } else {
                self::json(403, 'No autorizado');
            }

            $pregs = ExamenPregunta::SQL("
                SELECT ep.*,
                        COALESCE(pv.enunciado, 'Enunciado no encontrado') AS enunciado,
                        pv.contenido_json as opciones,
                        pv.respuesta_json as respuesta
                FROM examen_pregunta ep
                LEFT JOIN pregunta_version pv
                    ON pv.id = ep.pregunta_version_id
                WHERE ep.examen_id = {$eid}
                ORDER BY ep.orden_base ASC
                ");
            self::json(200, [
                'examen' => $ex,
                'preguntas' => $pregs
            ]);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  PUT /api/examenes/examen/{examen_id}
    // =========================
    public static function updateExamen(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('PUT');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $exDB = Examen::find($eid);
            if (!$exDB) self::json(404, 'Examen no encontrado');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');
            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$exDB->seccion_id)) self::json(403, 'No autorizado');
            }

            $data = self::body();
            $ex = new Examen((array)$exDB);

            foreach (
                [
                    'tipo',
                    'parcial_id',
                    'fecha_inicio',
                    'duracion_min',
                    'intentos_max',
                    'modo_armado',
                    'num_preguntas',
                    'dificultad_min',
                    'dificultad_max',
                    'mezclar_preguntas',
                    'mezclar_opciones',
                    'estado'
                ] as $k
            ) {
                if (array_key_exists($k, $data)) $ex->$k = $data[$k];
            }

            $ok = $ex->actualizar();
            self::json($ok ? 200 : 400, $ok ? 'Actualizado' : 'No se pudo actualizar');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  DELETE /api/examenes/examen/{examen_id}
    // =========================
    public static function deleteExamen(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('DELETE');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $exDB = Examen::find($eid);
            if (!$exDB) self::json(404, 'Examen no encontrado');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');
            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$exDB->seccion_id)) self::json(403, 'No autorizado');
            }

            // como examen no tiene eliminacion, lo archivamos
            $ex = new Examen((array)$exDB);
            $ex->estado = 'archivado';
            $ok = $ex->actualizar();

            self::json($ok ? 200 : 400, $ok ? 'Archivado' : 'No se pudo archivar');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/examenes/examen/{examen_id}/armar
    // =========================
    public static function armarExamen(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('POST');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $ex = Examen::find($eid);
            if (!$ex) self::json(404, 'Examen no encontrado');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');
            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$ex->seccion_id)) self::json(403, 'No autorizado');
            }

            if ((string)$ex->modo_armado !== 'random') self::json(400, 'modo_armado no es random');

            $materiaId = (int)$ex->materia_id;
            $scope = (string)$ex->tipo;
            $parcialId = $ex->parcial_id !== null ? (int)$ex->parcial_id : null;

            $difMin = (int)$ex->dificultad_min;
            $difMax = (int)$ex->dificultad_max;
            $num = (int)$ex->num_preguntas;

            $where = [];
            $where[] = "p.materia_id = {$materiaId}";
            $where[] = "pv.estado = 'aprobada'";
            $where[] = "pv.scope = '" . addslashes($scope) . "'";
            $where[] = "pv.dificultad BETWEEN {$difMin} AND {$difMax}";
            if ($scope === 'parcial') $where[] = "pv.parcial_id = " . (int)$parcialId;

            // seleccionar al azar
            $q = "SELECT pv.id
                  FROM pregunta_version pv
                  JOIN pregunta p ON p.id = pv.pregunta_id
                  WHERE " . implode(' AND ', $where) . "
                  ORDER BY RAND()
                  LIMIT {$num}";

            $ids = PreguntaVersion::SQL($q);
            if (empty($ids)) self::json(400, 'No hay preguntas aprobadas con esos filtros');

            // limpiar set anterior
            ExamenPregunta::SQL("DELETE FROM examen_pregunta WHERE examen_id = {$eid}");

            $orden = 1;
            foreach ($ids as $r) {
                $ep = new ExamenPregunta([
                    'examen_id' => $eid,
                    'pregunta_version_id' => (int)$r->id,
                    'puntos' => 1.00,
                    'orden_base' => $orden++
                ]);
                $ep->guardar();
            }

            self::json(200, 'Examen armado');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/examenes/examen/{examen_id}/publicar
    // =========================
    public static function publicarExamen(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('POST');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $exDB = Examen::find($eid);
            if (!$exDB) self::json(404, 'Examen no encontrado');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');
            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$exDB->seccion_id)) self::json(403, 'No autorizado');
            }

            $ex = new Examen((array)$exDB);
            $ex->estado = 'programado';
            $ok = $ex->actualizar();
            self::json($ok ? 200 : 400, $ok ? 'Publicado' : 'No se pudo publicar');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/examenes/examen/{examen_id}/cerrar
    // =========================
    public static function cerrarExamen(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('POST');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $exDB = Examen::find($eid);
            if (!$exDB) self::json(404, 'Examen no encontrado');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');
            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$exDB->seccion_id)) self::json(403, 'No autorizado');
            }

            $ex = new Examen((array)$exDB);
            $ex->estado = 'cerrado';
            $ok = $ex->actualizar();
            self::json($ok ? 200 : 400, $ok ? 'Cerrado' : 'No se pudo cerrar');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  GET /api/examenes/mis-examenes
    // =========================
    public static function getMisExamenes(Router $router): void
    {
        try {
            self::requireMethod('GET');

            if (!self::isAlumno()) self::json(403, 'No autorizado');

            $uid = self::uid();

            $q = "SELECT
                    e.*,
                    s.grupo,
                    s.materia_id,
                    i.id AS inscripcion_id
                  FROM inscripcion i
                  JOIN seccion s ON s.id = i.seccion_id
                  JOIN periodo p ON p.id = s.periodo_id
                  JOIN examen e ON e.seccion_id = s.id
                  WHERE i.estudiante_id = {$uid}
                    AND i.estado = 'inscrito'
                    AND p.estado = 'activo'
                    AND e.estado IN ('programado','activo')
                  ORDER BY e.fecha_inicio ASC";
            $rows = Examen::SQL($q);
            self::json(200, $rows);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/examenes/examen/{examen_id}/iniciar
    // =========================
    public static function iniciarIntento(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('POST');

            if (!self::isAlumno()) self::json(403, 'No autorizado');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $ex = Examen::find($eid);
            if (!$ex) self::json(404, 'Examen no encontrado');

            if (!in_array((string)$ex->estado, ['programado', 'activo'], true)) self::json(400, 'Examen no disponible');

            $inscId = self::alumnoInscritoEnSeccion(self::uid(), (int)$ex->seccion_id);
            if (!$inscId) self::json(403, 'No estás inscrito en esa sección');

            // ventana de tiempo
            $start = strtotime((string)$ex->fecha_inicio);
            $end = $start + ((int)$ex->duracion_min * 60);
            $now = time();
            if ($now < $start) self::json(400, 'Aún no inicia');
            if ($now > $end) self::json(400, 'Examen expirado');

            // intentos usados
            $used = ExamenIntento::SQL("SELECT COUNT(*) AS c FROM examen_intento WHERE examen_id = {$eid} AND inscripcion_id = {$inscId}");
            $cnt = (int)($used[0]->c ?? 0);
            if ($cnt >= (int)$ex->intentos_max) self::json(400, 'Ya agotaste tus intentos');

            $nextNum = $cnt + 1;

            $intento = new ExamenIntento([
                'examen_id' => $eid,
                'inscripcion_id' => $inscId,
                'intento_num' => $nextNum,
                'inicio_real' => date('Y-m-d H:i:s'),
                'estado' => 'en_progreso'
            ]);
            $res = $intento->crear();
            if (!($res['resultado'] ?? false)) self::json(400, 'No se pudo iniciar intento');
            $intentoId = (int)($res['id'] ?? 0);

            // preguntas del examen (base)
            $base = ExamenPregunta::SQL("SELECT pregunta_version_id, puntos, orden_base FROM examen_pregunta WHERE examen_id = {$eid} ORDER BY orden_base ASC");
            if (empty($base)) self::json(400, 'Examen sin preguntas (armar primero)');

            $items = $base;

            // mezclar orden preguntas por intento
            if ((int)$ex->mezclar_preguntas === 1) {
                shuffle($items);
            }

            $payloadPreguntas = [];
            $orden = 1;

            foreach ($items as $it) {
                $pvId = (int)$it->pregunta_version_id;
                $pv = PreguntaVersion::find($pvId);
                if (!$pv) continue;

                $contenido = json_decode((string)$pv->contenido_json, true);
                if (!is_array($contenido)) $contenido = [];

                $opOrden = null;

                if ((int)$ex->mezclar_opciones === 1) {
                    if (isset($contenido['opciones']) && is_array($contenido['opciones'])) {
                        $n = count($contenido['opciones']);
                        $perm = range(0, $n - 1);
                        shuffle($perm);
                        $opOrden = ['opciones' => $perm];
                        $contenido['opciones'] = array_map(fn($i) => $contenido['opciones'][$i], $perm);
                    } elseif (isset($contenido['items']) && is_array($contenido['items'])) {
                        $n = count($contenido['items']);
                        $perm = range(0, $n - 1);
                        shuffle($perm);
                        $opOrden = ['items' => $perm];
                        $contenido['items'] = array_map(fn($i) => $contenido['items'][$i], $perm);
                    }
                }

                $eip = new ExamenIntentoPregunta([
                    'examen_intento_id' => $intentoId,
                    'pregunta_version_id' => $pvId,
                    'orden' => $orden,
                    'opciones_orden_json' => $opOrden ? json_encode($opOrden, JSON_UNESCAPED_UNICODE) : null
                ]);
                $eip->guardar();

                $payloadPreguntas[] = [
                    'pregunta_version_id' => $pvId,
                    'tipo' => (string)$pv->tipo,
                    'enunciado' => (string)$pv->enunciado,
                    'contenido' => $contenido,
                    'orden' => $orden,
                    'puntos' => (float)$it->puntos
                ];

                $orden++;
            }

            self::json(201, [
                'examen' => $ex,
                'intento_id' => $intentoId,
                'intento_num' => $nextNum,
                'preguntas' => $payloadPreguntas
            ]);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/examenes/intento/{intento_id}/responder
    // =========================
    public static function guardarRespuesta(Router $router, $intento_id): void
    {
        try {
            self::requireMethod('POST');

            if (!self::isAlumno()) self::json(403, 'No autorizado');

            $iid = (int)$intento_id;
            if ($iid <= 0) self::json(400, 'intento_id inválido');

            $intento = ExamenIntento::find($iid);
            if (!$intento) self::json(404, 'Intento no encontrado');

            // validar pertenencia al alumno
            $insc = Inscripcion::find((int)$intento->inscripcion_id);
            if (!$insc || (int)$insc->estudiante_id !== (int)self::uid()) self::json(403, 'No autorizado');

            if ((string)$intento->estado !== 'en_progreso') self::json(400, 'Intento no editable');

            $data = self::body();
            $pvId = (int)($data['pregunta_version_id'] ?? 0);
            if ($pvId <= 0) self::json(400, 'pregunta_version_id requerido');

            $respJson = $data['respuesta_json'] ?? null;
            $respTexto = $data['respuesta_texto'] ?? null;

            $exists = ExamenRespuesta::SQL("SELECT id FROM examen_respuesta WHERE examen_intento_id = {$iid} AND pregunta_version_id = {$pvId} LIMIT 1");

            if (empty($exists)) {
                $r = new ExamenRespuesta([
                    'examen_intento_id' => $iid,
                    'pregunta_version_id' => $pvId,
                    'respuesta_json' => $respJson !== null ? json_encode($respJson, JSON_UNESCAPED_UNICODE) : null,
                    'respuesta_texto' => $respTexto
                ]);
                $res = $r->crear();
                if (!($res['resultado'] ?? false)) self::json(400, 'No se pudo guardar respuesta');
                self::json(201, 'Guardado');
            } else {
                $rid = (int)$exists[0]->id;
                $r = new ExamenRespuesta((array)ExamenRespuesta::find($rid));
                $r->respuesta_json = $respJson !== null ? json_encode($respJson, JSON_UNESCAPED_UNICODE) : null;
                $r->respuesta_texto = $respTexto;
                $ok = $r->actualizar();
                self::json($ok ? 200 : 400, $ok ? 'Actualizado' : 'No se pudo actualizar');
            }
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/examenes/intento/{intento_id}/finalizar
    // =========================
    public static function finalizarIntento(Router $router, $intento_id): void
    {
        try {
            self::requireMethod('POST');

            if (!self::isAlumno()) self::json(403, 'No autorizado');

            $iid = (int)$intento_id;
            if ($iid <= 0) self::json(400, 'intento_id inválido');

            $intentoDB = ExamenIntento::find($iid);
            if (!$intentoDB) self::json(404, 'Intento no encontrado');

            $insc = Inscripcion::find((int)$intentoDB->inscripcion_id);
            if (!$insc || (int)$insc->estudiante_id !== (int)self::uid()) self::json(403, 'No autorizado');

            if ((string)$intentoDB->estado !== 'en_progreso') self::json(400, 'Intento no finalizable');

            $ex = Examen::find((int)$intentoDB->examen_id);
            if (!$ex) self::json(404, 'Examen no encontrado');

            // mapa puntos
            $ptsRows = ExamenPregunta::SQL("SELECT pregunta_version_id, puntos FROM examen_pregunta WHERE examen_id = " . (int)$ex->id);
            $puntos = [];
            foreach ($ptsRows as $r) $puntos[(int)$r->pregunta_version_id] = (float)$r->puntos;

            $pregs = ExamenIntentoPregunta::SQL("SELECT pregunta_version_id FROM examen_intento_pregunta WHERE examen_intento_id = {$iid} ORDER BY orden ASC");
            if (empty($pregs)) self::json(400, 'Intento sin preguntas');

            $total = 0.0;

            foreach ($pregs as $pr) {
                $pvId = (int)$pr->pregunta_version_id;
                $pv = PreguntaVersion::find($pvId);
                if (!$pv) continue;

                $maxPts = $puntos[$pvId] ?? 1.0;

                $respRow = ExamenRespuesta::SQL("SELECT id, respuesta_json, respuesta_texto FROM examen_respuesta WHERE examen_intento_id = {$iid} AND pregunta_version_id = {$pvId} LIMIT 1");
                $respJson = null;
                $respTexto = null;
                $respId = null;

                if (!empty($respRow)) {
                    $respId = (int)$respRow[0]->id;
                    $respJson = json_decode((string)$respRow[0]->respuesta_json, true);
                    $respTexto = $respRow[0]->respuesta_texto;
                }

                $corr = json_decode((string)$pv->respuesta_json, true);
                if (!is_array($corr)) $corr = [];

                $punt = self::autoCalificar((string)$pv->tipo, $respJson, (string)$respTexto, $corr);
                $puntFinal = $punt * $maxPts;
                $total += $puntFinal;

                // guardar puntaje_auto
                if ($respId) {
                    $r = new ExamenRespuesta((array)ExamenRespuesta::find($respId));
                    $r->puntaje_auto = $puntFinal;
                    $r->estado_revision = 'pendiente';
                    $r->actualizar();
                } else {
                    $r = new ExamenRespuesta([
                        'examen_intento_id' => $iid,
                        'pregunta_version_id' => $pvId,
                        'respuesta_json' => $respJson ? json_encode($respJson, JSON_UNESCAPED_UNICODE) : null,
                        'respuesta_texto' => $respTexto,
                        'puntaje_auto' => $puntFinal,
                        'estado_revision' => 'pendiente'
                    ]);
                    $r->crear();
                }
            }

            $intento = new ExamenIntento((array)$intentoDB);
            $intento->fin_real = date('Y-m-d H:i:s');
            $intento->estado = 'enviado';
            $intento->calif_auto = $total;
            $intento->actualizar();

            self::json(200, [
                'calif_auto' => $total,
                'estado' => 'enviado'
            ]);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  GET /api/examenes/intento/{intento_id}
    // =========================
    public static function getIntento(Router $router, $intento_id): void
    {
        try {
            self::requireMethod('GET');

            $iid = (int)$intento_id;
            if ($iid <= 0) self::json(400, 'intento_id inválido');

            $intento = ExamenIntento::find($iid);
            if (!$intento) self::json(404, 'Intento no encontrado');

            $rol = self::rol();
            if (self::isAdmin()) {
                // ok
            } elseif (self::isAlumno()) {
                $insc = Inscripcion::find((int)$intento->inscripcion_id);
                if (!$insc || (int)$insc->estudiante_id !== (int)self::uid()) self::json(403, 'No autorizado');
            } else {
                self::json(403, 'No autorizado');
            }

            self::json(200, $intento);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  GET /api/examenes/examen/{examen_id}/intentos
    // =========================
    public static function getIntentosExamen(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('GET');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $ex = Examen::find($eid);
            if (!$ex) self::json(404, 'Examen no encontrado');

            if (!(self::isAdmin() || self::isDocente() || self::isCoord())) self::json(403, 'No autorizado');

            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$ex->seccion_id)) self::json(403, 'No autorizado');
            }

            $rows = ExamenIntento::SQL("SELECT * FROM examen_intento WHERE examen_id = {$eid} ORDER BY created_at DESC");
            self::json(200, $rows);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  GET /api/examenes/intento/{intento_id}/detalle
    // =========================
    public static function getIntentoDetalle(Router $router, $intento_id): void{
        try {
            self::requireMethod('GET');

            $iid = (int)$intento_id;
            if ($iid <= 0) self::json(400, 'intento_id inválido');

            $intento = ExamenIntento::find($iid);
            if (!$intento) self::json(404, 'Intento no encontrado');

            $ex = Examen::find((int)$intento->examen_id);
            if (!$ex) self::json(404, 'Examen no encontrado');

            $preguntas = ExamenIntentoPregunta::SQL("
                SELECT
                    eip.examen_intento_id,
                    eip.pregunta_version_id,
                    eip.orden,
                    eip.opciones_orden_json,

                    pv.enunciado,
                    pv.tipo,
                    pv.contenido_json AS contenido,

                    COALESCE(ep.puntos, 1.00) AS puntos_max,
                    COALESCE(er.puntaje_manual, er.puntaje_auto, 0.00) AS puntos_obtenidos,

                    er.respuesta_json AS respuesta_alumno,
                    er.estado_revision,
                    er.feedback

                FROM examen_intento_pregunta eip
                JOIN pregunta_version pv
                ON pv.id = eip.pregunta_version_id

                LEFT JOIN examen_respuesta er
                ON er.examen_intento_id = eip.examen_intento_id
                AND er.pregunta_version_id = eip.pregunta_version_id

                LEFT JOIN examen_pregunta ep
                ON ep.examen_id = {$ex->id}
                AND ep.pregunta_version_id = eip.pregunta_version_id

                WHERE eip.examen_intento_id = {$iid}
                ORDER BY eip.orden ASC
            ");

            self::json(200, [
                'intento' => $intento,
                'examen' => $ex,
                'preguntas' => $preguntas,
            ]);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno: ' . $e->getMessage());
        }
    }


    // =========================
    //  POST /api/examenes/intento/{intento_id}/calificar
    // =========================
    public static function calificarIntento(Router $router, $intento_id): void
    {
        try {
            self::requireMethod('POST');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');

            $iid = (int)$intento_id;
            if ($iid <= 0) self::json(400, 'intento_id inválido');

            $intentoDB = ExamenIntento::find($iid);
            if (!$intentoDB) self::json(404, 'Intento no encontrado');

            $ex = Examen::find((int)$intentoDB->examen_id);
            if (!$ex) self::json(404, 'Examen no encontrado');

            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$ex->seccion_id)) self::json(403, 'No autorizado');
            }

            $data = self::body();
            $ajustes = $data['ajustes'] ?? [];
            if (!is_array($ajustes)) $ajustes = [];

            $sumManual = 0.0;

            foreach ($ajustes as $a) {
                $respuestaId = (int)($a['respuesta_id'] ?? 0);
                if ($respuestaId <= 0) continue;

                $respDB = ExamenRespuesta::find($respuestaId);
                if (!$respDB) continue;

                $resp = new ExamenRespuesta((array)$respDB);
                if (array_key_exists('puntaje_manual', $a)) {
                    $resp->puntaje_manual = (float)$a['puntaje_manual'];
                    $sumManual += (float)$a['puntaje_manual'];
                }
                if (array_key_exists('feedback', $a)) {
                    $resp->feedback = $a['feedback'];
                }
                $resp->estado_revision = 'revisada';
                $resp->actualizar();
            }

            $califManual = array_key_exists('calif_manual', $data) ? (float)$data['calif_manual'] : $sumManual;

            $califAuto = (float)($intentoDB->calif_auto ?? 0);
            $califFinal = array_key_exists('calif_final', $data) ? (float)$data['calif_final'] : ($califAuto + $califManual);

            $intento = new ExamenIntento((array)$intentoDB);
            $intento->calif_manual = $califManual;
            $intento->calif_final = $califFinal;
            $intento->estado = 'revisado';
            $ok = $intento->actualizar();

            self::json($ok ? 200 : 400, $ok ? ['calif_final' => $califFinal] : 'No se pudo calificar');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/examenes/intento/{intento_id}/aplicar-bitacora
    // =========================
    public static function aplicarCalificacionBitacora(Router $router, $intento_id): void
    {
        try {
            self::requireMethod('POST');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');

            $iid = (int)$intento_id;
            if ($iid <= 0) self::json(400, 'intento_id inválido');

            $intento = ExamenIntento::find($iid);
            if (!$intento) self::json(404, 'Intento no encontrado');

            $ex = Examen::find((int)$intento->examen_id);
            if (!$ex) self::json(404, 'Examen no encontrado');

            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$ex->seccion_id)) self::json(403, 'No autorizado');
            }

            $calif = $intento->calif_final ?? $intento->calif_auto ?? null;
            if ($calif === null) self::json(400, 'Intento sin calificación');

            $inscId = (int)$intento->inscripcion_id;

            if ((string)$ex->tipo === 'parcial') {
                $parcialId = (int)$ex->parcial_id;
                // upsert manual con SQL (sin modelo)
                $exists = Examen::SQL("SELECT id FROM calificacion_examen_parcial WHERE inscripcion_id = {$inscId} AND parcial_id = {$parcialId} LIMIT 1");
                if (empty($exists)) {
                    Examen::SQL("INSERT INTO calificacion_examen_parcial (inscripcion_id, parcial_id, calificacion, created_at, updated_at)
                                VALUES ({$inscId}, {$parcialId}, " . (float)$calif . ", NOW(), NOW())");
                } else {
                    $id = (int)$exists[0]->id;
                    Examen::SQL("UPDATE calificacion_examen_parcial SET calificacion = " . (float)$calif . ", updated_at = NOW() WHERE id = {$id} LIMIT 1");
                }
            } else {
                $exists = Examen::SQL("SELECT id FROM calificacion_examen_final WHERE inscripcion_id = {$inscId} LIMIT 1");
                if (empty($exists)) {
                    Examen::SQL("INSERT INTO calificacion_examen_final (inscripcion_id, calificacion, created_at, updated_at)
                                VALUES ({$inscId}, " . (float)$calif . ", NOW(), NOW())");
                } else {
                    $id = (int)$exists[0]->id;
                    Examen::SQL("UPDATE calificacion_examen_final SET calificacion = " . (float)$calif . ", updated_at = NOW() WHERE id = {$id} LIMIT 1");
                }
            }

            self::json(200, 'Aplicado a bitácora');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  Auto-calificador (0..1)
    // =========================
    private static function autoCalificar(string $tipo, $respJson, ?string $respTexto, array $corr): float
    {
        try {
            if ($tipo === 'opcion_multiple') {
                $sel = $respJson['seleccion'] ?? null;
                $ok = $corr['correcta'] ?? null;
                if (!is_array($sel) || !is_array($ok)) return 0.0;
                sort($sel);
                sort($ok);
                return ($sel === $ok) ? 1.0 : 0.0;
            }

            if ($tipo === 'verdadero_falso') {
                if (!isset($respJson['valor']) || !isset($corr['correcta'])) return 0.0;
                return ((bool)$respJson['valor'] === (bool)$corr['correcta']) ? 1.0 : 0.0;
            }

            if ($tipo === 'completar') {
                $bl = $respJson['blanks'] ?? [];
                $ok = $corr['blanks'] ?? [];
                if (!is_array($bl) || !is_array($ok)) return 0.0;

                $map = [];
                foreach ($bl as $b) {
                    if (!isset($b['id'])) continue;
                    $map[(int)$b['id']] = trim(mb_strtolower((string)($b['valor'] ?? '')));
                }

                foreach ($ok as $b) {
                    $id = (int)($b['id'] ?? 0);
                    $v = trim(mb_strtolower((string)($b['valor'] ?? '')));
                    if ($id <= 0) continue;
                    if (!isset($map[$id]) || $map[$id] !== $v) return 0.0;
                }
                return 1.0;
            }

            if ($tipo === 'numerica') {
                $v = $respJson['valor'] ?? null;
                $ok = $corr['valor'] ?? null;
                $tol = (float)($corr['tolerancia'] ?? 0.0);
                if ($v === null || $ok === null) return 0.0;
                $v = (float)$v;
                $ok = (float)$ok;
                return (abs($v - $ok) <= $tol) ? 1.0 : 0.0;
            }

            if ($tipo === 'ordenar') {
                $ord = $respJson['orden'] ?? null;
                $ok = $corr['orden'] ?? null;
                if (!is_array($ord) || !is_array($ok)) return 0.0;
                return ($ord === $ok) ? 1.0 : 0.0;
            }

            if ($tipo === 'relacionar') {
                $ans = $respJson['correctas'] ?? null;
                $ok = $corr['correctas'] ?? null;
                if (!is_array($ans) || !is_array($ok)) return 0.0;

                // normalizamos a strings ordenados
                $norm = function ($arr) {
                    $out = [];
                    foreach ($arr as $p) {
                        $out[] = (string)($p['izq'] ?? '') . '=>' . (string)($p['der'] ?? '');
                    }
                    sort($out);
                    return $out;
                };

                return ($norm($ans) === $norm($ok)) ? 1.0 : 0.0;
            }

            if ($tipo === 'abierta') {
                // heurística simple por keywords si se proveen
                $text = trim(mb_strtolower((string)$respTexto));
                if ($text === '') return 0.0;

                $keywords = $corr['keywords'] ?? [];
                $minHits = (int)($corr['min_hits'] ?? 1);

                if (!is_array($keywords) || empty($keywords)) return 0.0;

                $hits = 0;
                foreach ($keywords as $k) {
                    $k = trim(mb_strtolower((string)$k));
                    if ($k !== '' && mb_strpos($text, $k) !== false) $hits++;
                }

                return ($hits >= $minHits) ? 1.0 : 0.0;
            }

            // default
            return 0.0;
        } catch (\Throwable $e) {
            return 0.0;
        }
    }

    // =========================
    //  PUT /api/examenes/examen/{examen_id}/pregunta/{pregunta_version_id}
    //  Body: { puntos: number }
    // =========================
    public static function updatePuntosPregunta(Router $router, $examen_id, $pregunta_version_id): void
    {
        try {
            self::requireMethod('PUT');

            $eid = (int)$examen_id;
            $pvId = (int)$pregunta_version_id;

            if ($eid <= 0) self::json(400, 'examen_id inválido');
            if ($pvId <= 0) self::json(400, 'pregunta_version_id inválido');

            $exDB = Examen::find($eid);
            if (!$exDB) self::json(404, 'Examen no encontrado');

            // permisos: solo admin/docente dueño de la sección
            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');
            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$exDB->seccion_id)) self::json(403, 'No autorizado');
            }

            // Solo en borrador (para no alterar intentos ya creados)
            if ((string)$exDB->estado !== 'borrador') {
                self::json(409, 'Solo puedes cambiar puntos cuando el examen está en borrador');
            }

            $data = self::body();
            if (!array_key_exists('puntos', $data)) self::json(400, 'puntos requerido');

            $puntos = (float)$data['puntos'];
            if (!is_finite($puntos)) self::json(400, 'puntos inválido');

            // límites acorde a DECIMAL(6,2): 0.01 .. 9999.99
            $puntos = round($puntos, 2);
            if ($puntos <= 0) self::json(400, 'puntos debe ser mayor a 0');
            if ($puntos > 9999.99) $puntos = 9999.99;

            // verificar que esa pregunta exista en el examen
            $exists = ExamenPregunta::SQL("
            SELECT 1
            FROM examen_pregunta
            WHERE examen_id = {$eid} AND pregunta_version_id = {$pvId}
            LIMIT 1
        ");
            if (empty($exists)) self::json(404, 'La pregunta no está en este examen');

            // update
            ExamenPregunta::SQL("
            UPDATE examen_pregunta
            SET puntos = {$puntos}
            WHERE examen_id = {$eid} AND pregunta_version_id = {$pvId}
            LIMIT 1
        ");

            // devolver row actualizada (útil para UI)
            $row = ExamenPregunta::SQL("
            SELECT ep.*,
                   COALESCE(pv.enunciado, 'Enunciado no encontrado') AS enunciado
            FROM examen_pregunta ep
            LEFT JOIN pregunta_version pv ON pv.id = ep.pregunta_version_id
            WHERE ep.examen_id = {$eid} AND ep.pregunta_version_id = {$pvId}
            LIMIT 1
        ");

            self::json(200, $row ? $row[0] : 'Actualizado');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    public static function deletePreguntaExamen(Router $router, $examen_id, $pregunta_version_id): void
    {
        try {
            self::requireMethod('DELETE');

            $eid = (int)$examen_id;
            $pvId = (int)$pregunta_version_id;

            if ($eid <= 0) self::json(400, 'examen_id inválido');
            if ($pvId <= 0) self::json(400, 'pregunta_version_id inválido');

            $exDB = Examen::find($eid);
            if (!$exDB) self::json(404, 'Examen no encontrado');

            if (!(self::isAdmin() || self::isDocente())) self::json(403, 'No autorizado');
            if (self::isDocente() && !self::isAdmin()) {
                if (!self::docenteEsDeSeccion(self::uid(), (int)$exDB->seccion_id)) self::json(403, 'No autorizado');
            }

            if ((string)$exDB->estado !== 'borrador') {
                self::json(409, 'Solo puedes eliminar preguntas cuando el examen está en borrador');
            }

            $exists = ExamenPregunta::SQL("
            SELECT 1
            FROM examen_pregunta
            WHERE examen_id = {$eid} AND pregunta_version_id = {$pvId}
            LIMIT 1
        ");
            if (empty($exists)) self::json(404, 'La pregunta no está en este examen');

            ExamenPregunta::SQL("
            DELETE FROM examen_pregunta
            WHERE examen_id = {$eid} AND pregunta_version_id = {$pvId}
            LIMIT 1
        ");
            $row = ExamenPregunta::SQL("
            SELECT ep.*,
                   COALESCE(pv.enunciado, 'Enunciado no encontrado') AS enunciado
            FROM examen_pregunta ep
            LEFT JOIN pregunta_version pv ON pv.id = ep.pregunta_version_id
            WHERE ep.examen_id = {$eid} AND ep.pregunta_version_id = {$pvId}
            LIMIT 1
        ");

            self::json(200, $row ? $row[0] : 'Actualizado');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // GET /api/examenes/mis-intentos/{examen_id}
    public static function getMisIntentos(Router $router, $examen_id): void
    {
        try {
            self::requireMethod('GET');

            if (!self::isAlumno()) self::json(403, 'No autorizado');

            $eid = (int)$examen_id;
            if ($eid <= 0) self::json(400, 'examen_id inválido');

            $uid = self::uid();

            $q = "SELECT ei.* 
              FROM examen_intento ei
              JOIN inscripcion i ON i.id = ei.inscripcion_id
              WHERE ei.examen_id = {$eid}
                AND i.estudiante_id = {$uid}
              ORDER BY ei.intento_num ASC";

            $rows = ExamenIntento::SQL($q);
            self::json(200, $rows);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }
}
