<?php
namespace Model;

class Area extends ActiveRecord {
    protected static $tabla = 'area';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'nombre', 'estado', 'created_at', 'updated_at'
    ];

    public $id, $nombre, $estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id         = $args['id'] ?? null;
        $this->nombre     = $args['nombre'] ?? '';
        $this->estado     = $args['estado'] ?? 'activa';
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }
}
