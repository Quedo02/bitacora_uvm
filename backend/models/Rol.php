<?php
namespace Model;

class Rol extends ActiveRecord {
    protected static $tabla = 'rol';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'nombre', 'descripcion', 'created_at', 'updated_at'
    ];

    public $id, $nombre, $descripcion, $created_at, $updated_at;

    public const ADMIN = 1;
    public const COORDINADOR = 2;
    public const DOCENTE_TC = 3;
    public const DOCENTE_GENERAL = 4;
    public const ESTUDIANTE = 5;

    public function __construct($args = []) {
        $this->id          = $args['id'] ?? null;
        $this->nombre      = $args['nombre'] ?? '';
        $this->descripcion = $args['descripcion'] ?? null;
        $this->created_at  = $args['created_at'] ?? null;
        $this->updated_at  = $args['updated_at'] ?? null;
    }
}
