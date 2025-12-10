<?php
namespace Model;

class Usuario extends ActiveRecord {
    protected static $tabla = 'usuario';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id','rol_id', 'nombre_completo', 'correo', 'matricula',
        'password_hash', 'estado', 'created_at', 'updated_at'
    ];

    public $id, $rol_id, $nombre_completo, $correo, $matricula,
           $password_hash, $estado, $created_at, $updated_at;

    public const ACTIVO = 'activo';
    public const INACTIVO = 'inactivo';

    public function __construct($args = []) {
        $this->id               = $args['id'] ?? null;
        $this->rol_id           = $args['rol_id'] ?? null;
        $this->nombre_completo  = $args['nombre_completo'] ?? '';
        $this->correo           = $args['correo'] ?? '';
        $this->matricula        = $args['matricula'] ?? null;
        $this->password_hash    = $args['password_hash'] ?? '';
        $this->estado           = $args['estado'] ?? self::ACTIVO;
        $this->created_at       = $args['created_at'] ?? null;
        $this->updated_at       = $args['updated_at'] ?? null;
    }

    // ============================
    // Helpers
    // ============================
    private static function looksLikeBcrypt($value): bool {
        if (!is_string($value) || $value === '') return false;

        // Acepta $2a$, $2b$, $2y$ con cost de 2 dígitos
        return (bool) preg_match('/^\$2[aby]\$\d{2}\$/', $value);
    }

    // ============================
    // Finders
    // ============================
    public static function findByLoginIdentifier(string $identifier) {
        $idTrim = trim($identifier);
        $correo = strtolower($idTrim);
        $matricula = ctype_digit($idTrim) ? $idTrim : null;

        $sql = "SELECT * FROM ".static::$tabla."
                WHERE correo = :correo
                    OR matricula = :matricula
                LIMIT 1";

        $stmt = self::$db->prepare($sql);
        $stmt->bindValue(':correo', $correo);
        $stmt->bindValue(':matricula', $matricula);
        $stmt->execute();

        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? static::crearObjeto($row) : null;
    }

    public static function findByCorreo(string $correo) {
        $sql = "SELECT * FROM ".static::$tabla."
                WHERE correo = :c
                LIMIT 1";
        $stmt = self::$db->prepare($sql);
        $stmt->bindValue(':c', strtolower(trim($correo)));
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? static::crearObjeto($row) : null;
    }

    public static function findByMatricula($matricula) {
        $sql = "SELECT * FROM ".static::$tabla."
                WHERE matricula = :m
                LIMIT 1";
        $stmt = self::$db->prepare($sql);
        $stmt->bindValue(':m', $matricula);
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? static::crearObjeto($row) : null;
    }

    // ============================
    // Persistencia
    // ============================
    public function crear() {
        // Si viene password_hash como password plano, hashea.
        // Si ya viene un bcrypt ($2b$, $2y$, etc), NO lo vuelvas a hashear.
        if (!empty($this->password_hash) && !self::looksLikeBcrypt($this->password_hash)) {
            $this->password_hash = password_hash($this->password_hash, PASSWORD_BCRYPT);
        }
        return parent::crear();
    }

    public function actualizar() {
        // Mismo blindaje para updates:
        // evita re-hashear hashes existentes (especialmente $2b$ de JS).
        if (!empty($this->password_hash) && !self::looksLikeBcrypt($this->password_hash)) {
            $this->password_hash = password_hash($this->password_hash, PASSWORD_BCRYPT);
        }
        return parent::actualizar();
    }
}
