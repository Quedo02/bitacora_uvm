<?php
namespace Model;

class Materia extends ActiveRecord {
    protected static $tabla = 'materia';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'codigo_materia', 'nombre_materia', 'tipo_evaluacion',
        'estado', 'created_at', 'updated_at'
    ];

    public $id, $codigo_materia, $nombre_materia, $tipo_evaluacion,
           $estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id              = $args['id'] ?? null;
        $this->codigo_materia  = $args['codigo_materia'] ?? '';
        $this->nombre_materia  = $args['nombre_materia'] ?? '';
        $this->tipo_evaluacion = $args['tipo_evaluacion'] ?? 'teorica';
        $this->estado          = $args['estado'] ?? 'activa';
        $this->created_at      = $args['created_at'] ?? null;
        $this->updated_at      = $args['updated_at'] ?? null;
    }

    public static function findByCodigo(string $codigo) {
        $sql = "SELECT * FROM ".static::$tabla."
                WHERE codigo_materia = :c
                LIMIT 1";
        $stmt = self::$db->prepare($sql);
        $stmt->bindValue(':c', trim($codigo));
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? static::crearObjeto($row) : null;
    }
}
