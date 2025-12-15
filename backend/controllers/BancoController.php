<?php
namespace Controllers;

use MVC\Router;
use Model\Periodo;
use Model\Seccion;
use Model\Inscripcion;
use Model\Materia;
use Model\Tema;
use Model\Pregunta;
use Model\PreguntaVersion;
use Model\PreguntaVersionTema;
use Model\PreguntaVersionArea;
use Model\PreguntaVoto;
use Model\CoordinadorProfile;
use Model\AreaDocenteTc;
use Model\MateriaArea;

class BancoController {

    private static function json(int $code, $payload = null): void {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($code);
        if ($payload === null) {
            echo json_encode(['code' => $code], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(['code' => $code, 'response' => $payload], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    private static function requireMethod(string $method): void {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
            http_response_code(405);
            exit;
        }
    }

    private static function body(): array {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '[]', true);
        return is_array($data) ? $data : [];
    }

    private static function rol(): int {
        return (int)($_SESSION['rol_id'] ?? 0);
    }

    private static function uid(): int {
        return (int)($_SESSION['id'] ?? 0);
    }

    private static function isAdmin(): bool { return self::rol() === 1; }
    private static function isCoord(): bool { return self::rol() === 2; }
    private static function isTc(): bool { return self::rol() === 3; }
    private static function isDocente(): bool { return in_array(self::rol(), [3,4], true); }

    private static function coordAreaId(int $userId): ?int {
        $cp = CoordinadorProfile::where('usuario_id', $userId);
        return $cp ? (int)$cp->area_id : null;
    }

    private static function tcAreaIds(int $userId): array {
        $rows = AreaDocenteTc::SQL("SELECT area_id FROM area_docente_tc WHERE usuario_id = " . (int)$userId);
        return array_map(fn($r) => (int)$r->area_id, $rows);
    }

    private static function materiaAreas(int $materiaId): array {
        $rows = MateriaArea::SQL("SELECT area_id, es_estandarizable, estado FROM materia_area WHERE materia_id = " . (int)$materiaId . " AND estado = 'activa'");
        $areas = [];
        foreach ($rows as $r) {
            $areas[] = [
                'area_id' => (int)$r->area_id,
                'es_estandarizable' => (int)$r->es_estandarizable
            ];
        }
        return $areas;
    }

    private static function docenteImparteMateriaEnPeriodoActivo(int $docenteId, int $materiaId): bool {
        $q = "SELECT 1
              FROM seccion s
              JOIN periodo p ON p.id = s.periodo_id
              WHERE p.estado = 'activo'
                AND s.estado = 'activa'
                AND s.docente_id = " . (int)$docenteId . "
                AND s.materia_id = " . (int)$materiaId . "
              LIMIT 1";
        $r = Seccion::SQL($q);
        return !empty($r);
    }

    private static function userPuedeCrearEnMateria(int $materiaId): bool {
        $rol = self::rol();
        $uid = self::uid();

        if ($rol === 1) return true; // admin

        // coordinador: solo si la materia pertenece a su área (materia_area)
        if ($rol === 2) {
            $areaId = self::coordAreaId($uid);
            if (!$areaId) return false;
            $rows = MateriaArea::SQL("SELECT 1 FROM materia_area WHERE materia_id = " . (int)$materiaId . " AND area_id = " . (int)$areaId . " AND estado = 'activa' LIMIT 1");
            return !empty($rows);
        }

        // docentes: solo si imparten actualmente esa materia (periodo activo)
        if (in_array($rol, [3,4], true)) {
            return self::docenteImparteMateriaEnPeriodoActivo($uid, $materiaId);
        }

        return false;
    }

    // =========================
    //  GET /api/banco/materias
    // =========================
    public static function getMateriasPermitidas(Router $router): void {
        try {
            self::requireMethod('GET');

            $rol = self::rol();
            if ($rol === 5 || $rol === 0) self::json(403, 'No autorizado');

            $uid = self::uid();

            if (self::isAdmin()) {
                $q = "SELECT DISTINCT m.id, m.codigo, m.nombre
                      FROM materia m
                      JOIN materia_area ma ON ma.materia_id = m.id
                      WHERE ma.estado='activa' AND ma.es_estandarizable = 1
                      ORDER BY m.nombre";
                $rows = Materia::SQL($q);
                self::json(200, $rows);
            }

            if (self::isCoord()) {
                $areaId = self::coordAreaId($uid);
                if (!$areaId) self::json(404, 'Coordinador sin área asignada');

                $q = "SELECT DISTINCT m.id, m.codigo, m.nombre
                      FROM materia m
                      JOIN materia_area ma ON ma.materia_id = m.id
                      WHERE ma.area_id = " . (int)$areaId . "
                        AND ma.estado='activa' AND ma.es_estandarizable = 1
                      ORDER BY m.nombre";
                $rows = Materia::SQL($q);
                self::json(200, $rows);
            }

            // Docente TC/General: solo materias que imparte en periodo activo
            if (self::isDocente()) {
                $q = "SELECT DISTINCT m.id, m.codigo, m.nombre
                      FROM seccion s
                      JOIN periodo p ON p.id = s.periodo_id
                      JOIN materia m ON m.id = s.materia_id
                      JOIN materia_area ma ON ma.materia_id = m.id
                      WHERE p.estado = 'activo'
                        AND s.estado = 'activa'
                        AND s.docente_id = " . (int)$uid . "
                        AND ma.estado='activa' AND ma.es_estandarizable = 1
                      ORDER BY m.nombre";
                $rows = Materia::SQL($q);
                self::json(200, $rows);
            }

            self::json(403, 'No autorizado');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ==========================================
    //  GET /api/banco/materia/{id}/temas
    // ==========================================
    public static function getTemasMateria(Router $router, $materia_id): void {
        try {
            self::requireMethod('GET');

            $rol = self::rol();
            if ($rol === 5 || $rol === 0) self::json(403, 'No autorizado');

            $materiaId = (int)$materia_id;
            if ($materiaId <= 0) self::json(400, 'materia_id inválido');

            // opcional: restringir por permisos de creación/lectura
            if (!self::isAdmin() && !self::userPuedeCrearEnMateria($materiaId) && !self::isCoord()) {
                // coordinador sí puede ver temas de su área aunque no cree, pero ya lo cubrimos en isCoord
                self::json(403, 'No autorizado');
            }

            $rows = Tema::SQL("SELECT * FROM tema WHERE materia_id = " . $materiaId . " AND estado='activo' ORDER BY parcial_id IS NULL, parcial_id, nombre");
            self::json(200, $rows);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ==========================================
    //  POST /api/banco/materia/{id}/temas
    // ==========================================
    public static function createTema(Router $router, $materia_id): void {
        try {
            self::requireMethod('POST');

            if (!(self::isAdmin() || self::isCoord())) self::json(403, 'No autorizado');

            $materiaId = (int)$materia_id;
            $data = self::body();

            $nombre = trim((string)($data['nombre'] ?? ''));
            $parcialId = isset($data['parcial_id']) ? (int)$data['parcial_id'] : null;

            if ($materiaId <= 0 || $nombre === '') self::json(400, 'Datos incompletos');

            // coordinador: validar que la materia pertenezca a su área
            if (self::isCoord() && !self::isAdmin()) {
                $areaId = self::coordAreaId(self::uid());
                if (!$areaId) self::json(403, 'No autorizado');

                $ok = MateriaArea::SQL("SELECT 1 FROM materia_area WHERE materia_id = {$materiaId} AND area_id = " . (int)$areaId . " AND estado='activa' LIMIT 1");
                if (empty($ok)) self::json(403, 'Materia fuera de tu área');
            }

            $tema = new Tema([
                'materia_id' => $materiaId,
                'parcial_id' => $parcialId,
                'nombre' => $nombre,
                'estado' => 'activo'
            ]);

            $res = $tema->crear();
            self::json(201, $res);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ===========================
    //  PUT /api/banco/tema/{id}
    // ===========================
    public static function updateTema(Router $router, $tema_id): void {
        try {
            self::requireMethod('PUT');

            if (!(self::isAdmin() || self::isCoord())) self::json(403, 'No autorizado');

            $temaId = (int)$tema_id;
            if ($temaId <= 0) self::json(400, 'tema_id inválido');

            $temaDB = Tema::find($temaId);
            if (!$temaDB) self::json(404, 'Tema no encontrado');

            // coordinador: validar materia dentro de su área
            if (self::isCoord() && !self::isAdmin()) {
                $areaId = self::coordAreaId(self::uid());
                if (!$areaId) self::json(403, 'No autorizado');
                $ok = MateriaArea::SQL("SELECT 1 FROM materia_area WHERE materia_id = " . (int)$temaDB->materia_id . " AND area_id = " . (int)$areaId . " AND estado='activa' LIMIT 1");
                if (empty($ok)) self::json(403, 'Materia fuera de tu área');
            }

            $data = self::body();
            $nombre = array_key_exists('nombre', $data) ? trim((string)$data['nombre']) : (string)$temaDB->nombre;
            $parcialId = array_key_exists('parcial_id', $data) ? (int)$data['parcial_id'] : $temaDB->parcial_id;

            $tema = new Tema((array)$temaDB);
            $tema->nombre = $nombre;
            $tema->parcial_id = $parcialId;

            $ok = $tema->actualizar();
            self::json($ok ? 200 : 400, $ok ? 'Actualizado' : 'No se pudo actualizar');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =============================
    //  DELETE /api/banco/tema/{id}
    // =============================
    public static function deleteTema(Router $router, $tema_id): void {
        try {
            self::requireMethod('DELETE');

            if (!(self::isAdmin() || self::isCoord())) self::json(403, 'No autorizado');

            $temaId = (int)$tema_id;
            if ($temaId <= 0) self::json(400, 'tema_id inválido');

            $temaDB = Tema::find($temaId);
            if (!$temaDB) self::json(404, 'Tema no encontrado');

            // coordinador: validar materia dentro de su área
            if (self::isCoord() && !self::isAdmin()) {
                $areaId = self::coordAreaId(self::uid());
                if (!$areaId) self::json(403, 'No autorizado');
                $ok = MateriaArea::SQL("SELECT 1 FROM materia_area WHERE materia_id = " . (int)$temaDB->materia_id . " AND area_id = " . (int)$areaId . " AND estado='activa' LIMIT 1");
                if (empty($ok)) self::json(403, 'Materia fuera de tu área');
            }

            // como tema no tiene eliminacion, inactivamos
            $tema = new Tema((array)$temaDB);
            $tema->estado = 'inactivo';
            $ok = $tema->actualizar();

            self::json($ok ? 200 : 400, $ok ? 'Inactivado' : 'No se pudo inactivar');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  GET /api/banco/preguntas
    // =========================
    public static function getPreguntas(Router $router): void {
        try {
            self::requireMethod('GET');

            if (self::rol() === 5 || self::rol() === 0) self::json(403, 'No autorizado');

            $materiaId = isset($_GET['materia_id']) ? (int)$_GET['materia_id'] : null;
            $temaId = isset($_GET['tema_id']) ? (int)$_GET['tema_id'] : null;
            $parcialId = isset($_GET['parcial_id']) ? (int)$_GET['parcial_id'] : null;
            $estado = isset($_GET['estado']) ? preg_replace('/[^a-z_]/', '', (string)$_GET['estado']) : null;
            $difMin = isset($_GET['dificultad_min']) ? (int)$_GET['dificultad_min'] : null;
            $difMax = isset($_GET['dificultad_max']) ? (int)$_GET['dificultad_max'] : null;

            $where = [];
            $where[] = "1=1";

            if ($materiaId) $where[] = "p.materia_id = " . (int)$materiaId;
            if ($estado) $where[] = "p.estado = '" . addslashes($estado) . "'";
            if ($parcialId) $where[] = "pv.parcial_id = " . (int)$parcialId;
            if ($difMin !== null) $where[] = "pv.dificultad >= " . (int)$difMin;
            if ($difMax !== null) $where[] = "pv.dificultad <= " . (int)$difMax;
            if ($temaId) {
                $where[] = "EXISTS (SELECT 1 FROM pregunta_version_tema pvt WHERE pvt.pregunta_version_id = pv.id AND pvt.tema_id = " . (int)$temaId . ")";
            }

            // Filtro por alcance de usuario (evita ver cosas de otras áreas/materias)
            $rol = self::rol();
            $uid = self::uid();

            if ($rol === 2) {
                $areaId = self::coordAreaId($uid);
                if ($areaId) {
                    $where[] = "EXISTS (SELECT 1 FROM pregunta_version_area pva WHERE pva.pregunta_version_id = pv.id AND pva.area_id = " . (int)$areaId . ")";
                }
            } elseif (in_array($rol, [3,4], true)) {
                // docentes: solo materias que imparten en periodo activo
                $where[] = "EXISTS (
                    SELECT 1 FROM seccion s
                    JOIN periodo pe ON pe.id = s.periodo_id
                    WHERE pe.estado='activo'
                      AND s.estado='activa'
                      AND s.docente_id = " . (int)$uid . "
                      AND s.materia_id = p.materia_id
                )";
            }

            $q = "SELECT
                    p.id,
                    p.materia_id,
                    p.creada_por_usuario_id,
                    p.estado,
                    p.version_actual_id,
                    pv.tipo,
                    pv.enunciado,
                    pv.dificultad,
                    pv.scope,
                    pv.parcial_id,
                    pv.created_at AS version_created_at
                  FROM pregunta p
                  JOIN pregunta_version pv ON pv.id = p.version_actual_id
                  WHERE " . implode(' AND ', $where) . "
                  ORDER BY pv.created_at DESC
                  LIMIT 500";
            $rows = Pregunta::SQL($q);

            self::json(200, $rows);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================
    //  POST /api/banco/preguntas
    // =========================
    public static function createPregunta(Router $router): void {
        try {
            self::requireMethod('POST');

            if (self::rol() === 5 || self::rol() === 0) self::json(403, 'No autorizado');

            $data = self::body();

            $materiaId = (int)($data['materia_id'] ?? 0);
            if ($materiaId <= 0) self::json(400, 'materia_id requerido');

            if (!self::userPuedeCrearEnMateria($materiaId)) self::json(403, 'No autorizado para esa materia');

            // Solo materias estandarizables
            $mOk = MateriaArea::SQL("SELECT 1 FROM materia_area WHERE materia_id = {$materiaId} AND es_estandarizable = 1 AND estado='activa' LIMIT 1");
            if (empty($mOk)) self::json(400, 'Materia no estandarizable');

            $tipo = (string)($data['tipo'] ?? '');
            $enunciado = trim((string)($data['enunciado'] ?? ''));
            $dificultad = (int)($data['dificultad'] ?? 1);
            $scope = (string)($data['scope'] ?? 'parcial');
            $parcialId = isset($data['parcial_id']) ? (int)$data['parcial_id'] : null;

            $contenido = $data['contenido_json'] ?? [];
            $respuesta = $data['respuesta_json'] ?? [];

            $temaIds = $data['tema_ids'] ?? [];
            if (!is_array($temaIds)) $temaIds = [];

            if ($tipo === '' || $enunciado === '') self::json(400, 'tipo y enunciado son requeridos');
            if ($dificultad < 1) $dificultad = 1;
            if ($dificultad > 10) $dificultad = 10;

            // 1) pregunta base
            $pregunta = new Pregunta([
                'materia_id' => $materiaId,
                'creada_por_usuario_id' => self::uid(),
                'estado' => 'pendiente',
                'version_actual_id' => null
            ]);
            $resP = $pregunta->crear();
            if (!($resP['resultado'] ?? false)) self::json(400, 'No se pudo crear pregunta');
            $preguntaId = (int)($resP['id'] ?? 0);

            // 2) versión 1
            $pv = new PreguntaVersion([
                'pregunta_id' => $preguntaId,
                'version_num' => 1,
                'tipo' => $tipo,
                'enunciado' => $enunciado,
                'dificultad' => $dificultad,
                'scope' => $scope,
                'parcial_id' => $parcialId,
                'contenido_json' => json_encode($contenido, JSON_UNESCAPED_UNICODE),
                'respuesta_json' => json_encode($respuesta, JSON_UNESCAPED_UNICODE),
                'estado' => 'pendiente',
                'created_by' => self::uid()
            ]);
            $resV = $pv->crear();
            if (!($resV['resultado'] ?? false)) self::json(400, 'No se pudo crear versión');
            $pvId = (int)($resV['id'] ?? 0);

            // 3) set version actual
            $preguntaObj = new Pregunta((array)Pregunta::find($preguntaId));
            $preguntaObj->version_actual_id = $pvId;
            $preguntaObj->estado = 'pendiente';
            $preguntaObj->actualizar();

            // 4) snapshot de áreas de la materia
            $areas = self::materiaAreas($materiaId);
            foreach ($areas as $a) {
                $pva = new PreguntaVersionArea([
                    'pregunta_version_id' => $pvId,
                    'area_id' => (int)$a['area_id']
                ]);
                $pva->guardar();
            }

            // 5) temas
            foreach ($temaIds as $tid) {
                $tid = (int)$tid;
                if ($tid <= 0) continue;
                $pvt = new PreguntaVersionTema([
                    'pregunta_version_id' => $pvId,
                    'tema_id' => $tid
                ]);
                $pvt->guardar();
            }

            self::json(201, [
                'pregunta_id' => $preguntaId,
                'pregunta_version_id' => $pvId
            ]);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ==================================
    //  GET /api/banco/pregunta/{id}
    // ==================================
    public static function getPreguntaDetalle(Router $router, $pregunta_id): void {
        try {
            self::requireMethod('GET');

            if (self::rol() === 5 || self::rol() === 0) self::json(403, 'No autorizado');

            $pid = (int)$pregunta_id;
            if ($pid <= 0) self::json(400, 'pregunta_id inválido');

            $p = Pregunta::find($pid);
            if (!$p) self::json(404, 'Pregunta no encontrada');

            // filtro por alcance (coordinador/docente)
            $rol = self::rol();
            if ($rol === 2) {
                $areaId = self::coordAreaId(self::uid());
                if ($areaId) {
                    $ok = PreguntaVersionArea::SQL("SELECT 1 FROM pregunta_version_area WHERE pregunta_version_id = " . (int)$p->version_actual_id . " AND area_id = " . (int)$areaId . " LIMIT 1");
                    if (empty($ok)) self::json(403, 'No autorizado');
                }
            }
            if (in_array($rol, [3,4], true)) {
                if (!self::docenteImparteMateriaEnPeriodoActivo(self::uid(), (int)$p->materia_id) && !self::isAdmin()) {
                    self::json(403, 'No autorizado');
                }
            }

            $pv = PreguntaVersion::find((int)$p->version_actual_id);
            $areas = PreguntaVersionArea::SQL("SELECT area_id FROM pregunta_version_area WHERE pregunta_version_id = " . (int)$p->version_actual_id);
            $temas = PreguntaVersionTema::SQL("SELECT t.* FROM pregunta_version_tema pvt JOIN tema t ON t.id = pvt.tema_id WHERE pvt.pregunta_version_id = " . (int)$p->version_actual_id);
            $votos = PreguntaVoto::SQL("SELECT * FROM pregunta_voto WHERE pregunta_version_id = " . (int)$p->version_actual_id . " ORDER BY created_at ASC");

            self::json(200, [
                'pregunta' => $p,
                'version_actual' => $pv,
                'areas' => $areas,
                'temas' => $temas,
                'votos' => $votos
            ]);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ===========================================
    //  GET /api/banco/pregunta/{id}/versiones
    // ===========================================
    public static function getVersiones(Router $router, $pregunta_id): void {
        try {
            self::requireMethod('GET');

            if (self::rol() === 5 || self::rol() === 0) self::json(403, 'No autorizado');

            $pid = (int)$pregunta_id;
            if ($pid <= 0) self::json(400, 'pregunta_id inválido');

            $p = Pregunta::find($pid);
            if (!$p) self::json(404, 'Pregunta no encontrada');

            $rows = PreguntaVersion::SQL("SELECT * FROM pregunta_version WHERE pregunta_id = {$pid} ORDER BY version_num DESC");
            self::json(200, $rows);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ===========================================
    //  POST /api/banco/pregunta/{id}/version
    // ===========================================
    public static function createVersion(Router $router, $pregunta_id): void {
        try {
            self::requireMethod('POST');

            if (self::rol() === 5 || self::rol() === 0) self::json(403, 'No autorizado');

            $pid = (int)$pregunta_id;
            if ($pid <= 0) self::json(400, 'pregunta_id inválido');

            $p = Pregunta::find($pid);
            if (!$p) self::json(404, 'Pregunta no encontrada');

            $materiaId = (int)$p->materia_id;
            if (!self::userPuedeCrearEnMateria($materiaId)) self::json(403, 'No autorizado para esa materia');

            $data = self::body();
            $tipo = (string)($data['tipo'] ?? '');
            $enunciado = trim((string)($data['enunciado'] ?? ''));
            $dificultad = (int)($data['dificultad'] ?? 1);
            $scope = (string)($data['scope'] ?? 'parcial');
            $parcialId = isset($data['parcial_id']) ? (int)$data['parcial_id'] : null;
            $contenido = $data['contenido_json'] ?? [];
            $respuesta = $data['respuesta_json'] ?? [];
            $temaIds = $data['tema_ids'] ?? [];
            if (!is_array($temaIds)) $temaIds = [];

            if ($tipo === '' || $enunciado === '') self::json(400, 'tipo y enunciado son requeridos');

            $max = PreguntaVersion::SQL("SELECT MAX(version_num) AS mx FROM pregunta_version WHERE pregunta_id = {$pid}");
            $next = (int)($max[0]->mx ?? 1);
            $next = $next + 1;

            $pv = new PreguntaVersion([
                'pregunta_id' => $pid,
                'version_num' => $next,
                'tipo' => $tipo,
                'enunciado' => $enunciado,
                'dificultad' => max(1, min(10, $dificultad)),
                'scope' => $scope,
                'parcial_id' => $parcialId,
                'contenido_json' => json_encode($contenido, JSON_UNESCAPED_UNICODE),
                'respuesta_json' => json_encode($respuesta, JSON_UNESCAPED_UNICODE),
                'estado' => 'pendiente',
                'created_by' => self::uid()
            ]);
            $resV = $pv->crear();
            if (!($resV['resultado'] ?? false)) self::json(400, 'No se pudo crear versión');
            $pvId = (int)($resV['id'] ?? 0);

            // actualizar pregunta base
            $pObj = new Pregunta((array)$p);
            $pObj->version_actual_id = $pvId;
            $pObj->estado = 'pendiente';
            $pObj->actualizar();

            // snapshot áreas
            $areas = self::materiaAreas($materiaId);
            foreach ($areas as $a) {
                $pva = new PreguntaVersionArea([
                    'pregunta_version_id' => $pvId,
                    'area_id' => (int)$a['area_id']
                ]);
                $pva->guardar();
            }

            // temas
            foreach ($temaIds as $tid) {
                $tid = (int)$tid;
                if ($tid <= 0) continue;
                $pvt = new PreguntaVersionTema([
                    'pregunta_version_id' => $pvId,
                    'tema_id' => $tid
                ]);
                $pvt->guardar();
            }

            self::json(201, [
                'pregunta_version_id' => $pvId,
                'version_num' => $next
            ]);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ======================================
    //  GET /api/banco/aprobaciones/pendientes
    // ======================================
    public static function getPendientesAprobar(Router $router): void {
        try {
            self::requireMethod('GET');

            $rol = self::rol();
            if (!in_array($rol, [1,2,3], true)) self::json(403, 'No autorizado');

            $uid = self::uid();

            if ($rol === 1) {
                $q = "SELECT pv.*, p.materia_id
                      FROM pregunta_version pv
                      JOIN pregunta p ON p.id = pv.pregunta_id
                      WHERE pv.estado IN ('pendiente','revision')
                      ORDER BY pv.created_at DESC
                      LIMIT 500";
                $rows = PreguntaVersion::SQL($q);
                self::json(200, $rows);
            }

            if ($rol === 2) {
                $areaId = self::coordAreaId($uid);
                if (!$areaId) self::json(404, 'Coordinador sin área asignada');

                $q = "SELECT pv.*, p.materia_id
                      FROM pregunta_version pv
                      JOIN pregunta p ON p.id = pv.pregunta_id
                      JOIN pregunta_version_area pva ON pva.pregunta_version_id = pv.id
                      LEFT JOIN pregunta_voto v ON v.pregunta_version_id = pv.id AND v.votante_id = " . (int)$uid . "
                      WHERE pv.estado IN ('pendiente','revision')
                        AND pva.area_id = " . (int)$areaId . "
                        AND v.id IS NULL
                      ORDER BY pv.created_at DESC
                      LIMIT 500";
                $rows = PreguntaVersion::SQL($q);
                self::json(200, $rows);
            }

            if ($rol === 3) {
                $areas = self::tcAreaIds($uid);
                if (empty($areas)) self::json(200, []);

                $in = implode(',', array_map('intval', $areas));
                $q = "SELECT pv.*, p.materia_id
                      FROM pregunta_version pv
                      JOIN pregunta p ON p.id = pv.pregunta_id
                      JOIN pregunta_version_area pva ON pva.pregunta_version_id = pv.id
                      LEFT JOIN pregunta_voto v ON v.pregunta_version_id = pv.id AND v.votante_id = " . (int)$uid . "
                      WHERE pv.estado IN ('pendiente','revision')
                        AND pva.area_id IN ({$in})
                        AND v.id IS NULL
                      ORDER BY pv.created_at DESC
                      LIMIT 500";
                $rows = PreguntaVersion::SQL($q);
                self::json(200, $rows);
            }

            self::json(403, 'No autorizado');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================================
    //  POST /api/banco/version/{pv_id}/voto
    // =========================================
    public static function votarVersion(Router $router, $pregunta_version_id): void {
        try {
            self::requireMethod('POST');

            $rol = self::rol();
            if (!in_array($rol, [1,2,3], true)) self::json(403, 'No autorizado');

            $pvId = (int)$pregunta_version_id;
            if ($pvId <= 0) self::json(400, 'pregunta_version_id inválido');

            $pv = PreguntaVersion::find($pvId);
            if (!$pv) self::json(404, 'Versión no encontrada');

            $data = self::body();
            $decision = (string)($data['decision'] ?? $data['voto'] ?? '');
            $areaId = isset($data['area_id']) ? (int)$data['area_id'] : null;
            $comentario = isset($data['comentario']) ? trim((string)$data['comentario']) : null;

            if (!in_array($decision, ['aprobar','rechazar','revision'], true)) self::json(400, 'decision inválida');
            if (in_array($decision, ['rechazar','revision'], true) && (!$comentario || trim($comentario) === '')) {
                self::json(400, 'comentario es obligatorio para rechazo/revisión');
            }

            $uid = self::uid();

            // validar si ya votó
            $ya = PreguntaVoto::SQL("SELECT 1 FROM pregunta_voto WHERE pregunta_version_id = {$pvId} AND votante_id = {$uid} LIMIT 1");
            if (!empty($ya)) self::json(409, 'Ya votaste esta versión');

            // validar área y rol permitido
            if ($rol === 2) {
                $miArea = self::coordAreaId($uid);
                if (!$miArea) self::json(403, 'No autorizado');
                if ($areaId === null) $areaId = $miArea;
                if ((int)$areaId !== (int)$miArea) self::json(403, 'area_id no coincide con tu área');

                $ok = PreguntaVersionArea::SQL("SELECT 1 FROM pregunta_version_area WHERE pregunta_version_id = {$pvId} AND area_id = " . (int)$areaId . " LIMIT 1");
                if (empty($ok)) self::json(403, 'Esta versión no pertenece a tu área');
            }

            if ($rol === 3) {
                if ($areaId === null) self::json(400, 'area_id requerido para Docente TC');
                $misAreas = self::tcAreaIds($uid);
                if (!in_array((int)$areaId, $misAreas, true)) self::json(403, 'No eres TC de esa área');

                $ok = PreguntaVersionArea::SQL("SELECT 1 FROM pregunta_version_area WHERE pregunta_version_id = {$pvId} AND area_id = " . (int)$areaId . " LIMIT 1");
                if (empty($ok)) self::json(403, 'Esta versión no pertenece a esa área');
            }

            // admin puede votar sin área (o con área si quiere)
            if ($rol === 1 && $areaId === 0) $areaId = null;

            // insertar voto
            $voto = new PreguntaVoto([
                'pregunta_version_id' => $pvId,
                'area_id' => $areaId,
                'votante_id' => $uid,
                'decision' => $decision,
                'comentario' => $comentario
            ]);
            $resV = $voto->crear();
            if (!($resV['resultado'] ?? false)) self::json(400, 'No se pudo registrar voto');

            // recalcular estado de la versión (y de la pregunta)
            self::recalcularEstado($pvId);

            self::json(201, 'Voto registrado');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // =========================================
    //  GET /api/banco/version/{pv_id}/votos
    // =========================================
    public static function getVotosVersion(Router $router, $pregunta_version_id): void {
        try {
            self::requireMethod('GET');

            if (self::rol() === 5 || self::rol() === 0) self::json(403, 'No autorizado');

            $pvId = (int)$pregunta_version_id;
            if ($pvId <= 0) self::json(400, 'pregunta_version_id inválido');

            $rows = PreguntaVoto::SQL("SELECT v.*, u.rol_id FROM pregunta_voto v JOIN usuario u ON u.id = v.votante_id WHERE v.pregunta_version_id = {$pvId} ORDER BY v.created_at ASC");
            self::json(200, $rows);
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ===========================
    //  DELETE /api/banco/pregunta/{id}
    //  (admin) archiva
    // ===========================
    public static function deletePregunta(Router $router, $pregunta_id): void {
        try {
            self::requireMethod('DELETE');
            if (!self::isAdmin()) self::json(403, 'No autorizado');

            $pid = (int)$pregunta_id;
            if ($pid <= 0) self::json(400, 'pregunta_id inválido');

            $p = Pregunta::find($pid);
            if (!$p) self::json(404, 'Pregunta no encontrada');

            $pObj = new Pregunta((array)$p);
            $pObj->estado = 'archivada';
            $ok = $pObj->actualizar();

            self::json($ok ? 200 : 400, $ok ? 'Archivada' : 'No se pudo archivar');
        } catch (\Throwable $e) {
            self::json(500, 'Error interno');
        }
    }

    // ===========================
    //  Reglas de aprobación
    // ===========================
    private static function recalcularEstado(int $pvId): void {
        // admin override
        $adminApprove = PreguntaVoto::SQL("SELECT 1
            FROM pregunta_voto v
            JOIN usuario u ON u.id = v.votante_id
            WHERE v.pregunta_version_id = {$pvId}
              AND v.decision = 'aprobar'
              AND u.rol_id = 1
            LIMIT 1");
        if (!empty($adminApprove)) {
            self::setEstadoVersionYPregunta($pvId, 'aprobada');
            return;
        }

        // si existe rechazo -> rechazado
        $hasRechazo = PreguntaVoto::SQL("SELECT 1 FROM pregunta_voto WHERE pregunta_version_id = {$pvId} AND decision = 'rechazar' LIMIT 1");
        if (!empty($hasRechazo)) {
            self::setEstadoVersionYPregunta($pvId, 'rechazada');
            return;
        }

        // si existe revisión -> revision
        $hasRevision = PreguntaVoto::SQL("SELECT 1 FROM pregunta_voto WHERE pregunta_version_id = {$pvId} AND decision = 'revision' LIMIT 1");
        if (!empty($hasRevision)) {
            self::setEstadoVersionYPregunta($pvId, 'revision');
            return;
        }

        // áreas de la versión
        $areas = PreguntaVersionArea::SQL("SELECT area_id FROM pregunta_version_area WHERE pregunta_version_id = {$pvId}");
        $areaIds = array_map(fn($r) => (int)$r->area_id, $areas);

        // coordinadores que aprobaron (por área)
        $coord = PreguntaVoto::SQL("SELECT DISTINCT v.area_id
            FROM pregunta_voto v
            JOIN usuario u ON u.id = v.votante_id
            WHERE v.pregunta_version_id = {$pvId}
              AND v.decision = 'aprobar'
              AND u.rol_id = 2
              AND v.area_id IS NOT NULL");
        $coordAreas = array_map(fn($r) => (int)$r->area_id, $coord);

        // TC que aprobaron (por área)
        $tc = PreguntaVoto::SQL("SELECT DISTINCT v.area_id
            FROM pregunta_voto v
            JOIN usuario u ON u.id = v.votante_id
            WHERE v.pregunta_version_id = {$pvId}
              AND v.decision = 'aprobar'
              AND u.rol_id = 3
              AND v.area_id IS NOT NULL");
        $tcAreas = array_map(fn($r) => (int)$r->area_id, $tc);

        // 1) Aprobación por misma área: coord + tc
        foreach ($areaIds as $a) {
            if (in_array($a, $coordAreas, true) && in_array($a, $tcAreas, true)) {
                self::setEstadoVersionYPregunta($pvId, 'aprobada');
                return;
            }
        }

        // 2) Multi-área: dos coordinadores distintos
        $coordDistinct = array_values(array_unique(array_intersect($coordAreas, $areaIds)));
        if (count($coordDistinct) >= 2) {
            self::setEstadoVersionYPregunta($pvId, 'aprobada');
            return;
        }

        // si no se cumple, queda pendiente
        self::setEstadoVersionYPregunta($pvId, 'pendiente');
    }

    private static function setEstadoVersionYPregunta(int $pvId, string $estado): void {
        $pv = PreguntaVersion::find($pvId);
        if (!$pv) return;

        $pvObj = new PreguntaVersion((array)$pv);
        $pvObj->estado = $estado;
        $pvObj->actualizar();

        // pregunta base (refleja estado de la versión actual)
        $pid = (int)$pv->pregunta_id;
        $p = Pregunta::find($pid);
        if (!$p) return;

        $pObj = new Pregunta((array)$p);
        $pObj->estado = $estado;
        // nota: version_actual_id ya apunta a pvId cuando aplica (en create/edit)
        $pObj->actualizar();
    }
}
