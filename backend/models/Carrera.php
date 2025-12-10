<?php
namespace Model;

class Carrera extends ActiveRecord {
    protected static $tabla = 'carrera';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'nombre_carrera', 'codigo_carrera', 'area_id',
        'coordinador_id', 'estado', 'created_at', 'updated_at'
    ];

    public $id, $nombre_carrera, $codigo_carrera, $area_id,
           $coordinador_id, $estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id             = $args['id'] ?? null;
        $this->nombre_carrera = $args['nombre_carrera'] ?? '';
        $this->codigo_carrera = $args['codigo_carrera'] ?? '';
        $this->area_id        = $args['area_id'] ?? null;
        $this->coordinador_id = $args['coordinador_id'] ?? null;
        $this->estado         = $args['estado'] ?? 'activa';
        $this->created_at     = $args['created_at'] ?? null;
        $this->updated_at     = $args['updated_at'] ?? null;
    }

    public static function findByCodigo(string $codigo) {
        $sql = "SELECT * FROM ".static::$tabla."
                WHERE codigo_carrera = :c
                LIMIT 1";
        $stmt = self::$db->prepare($sql);
        $stmt->bindValue(':c', trim($codigo));
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? static::crearObjeto($row) : null;
    }
}
