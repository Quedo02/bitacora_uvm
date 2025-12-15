<?php
namespace Model;

class Parcial extends ActiveRecord {
    protected static $tabla = 'parcial';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'nombre', 'orden', 'created_at', 'updated_at'
    ];

    public $id, $nombre, $orden, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id            = $args['id'] ?? null;
        $this->nombre    = $args['nombre'] ?? null;
        $this->orden = $args['orden'] ?? null;
        $this->created_at    = $args['created_at'] ?? null;
        $this->updated_at    = $args['updated_at'] ?? null;
    }
}
