<?php
namespace Model;

class Periodo extends ActiveRecord {
    protected static $tabla = 'periodo';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'codigo', 'nombre', 'fecha_inicio', 'fecha_fin',
        'estado', 'created_at', 'updated_at'
    ];

    public $id, $codigo, $nombre, $fecha_inicio, $fecha_fin,
           $estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id           = $args['id'] ?? null;
        $this->codigo       = $args['codigo'] ?? '';
        $this->nombre       = $args['nombre'] ?? null;
        $this->fecha_inicio = $args['fecha_inicio'] ?? null;
        $this->fecha_fin    = $args['fecha_fin'] ?? null;
        $this->estado       = $args['estado'] ?? 'planeado';
        $this->created_at   = $args['created_at'] ?? null;
        $this->updated_at   = $args['updated_at'] ?? null;
    }

    public static function findByCodigo(string $codigo) {
        $sql = "SELECT * FROM ".static::$tabla."
                WHERE codigo = :c
                LIMIT 1";
        $stmt = self::$db->prepare($sql);
        $stmt->bindValue(':c', trim($codigo));
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? static::crearObjeto($row) : null;
    }

    public static function actual($fecha = null) {
        $fecha = $fecha ?? date('Y-m-d');
        return static::whereValueBetween('fecha_inicio', 'fecha_fin', $fecha);
    }
}
