<?php
namespace Model;

class Tema extends ActiveRecord {
    protected static $tabla = 'tema';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'materia_id', 'parcial_id', 'nombre', 'estado', 'created_at', 'updated_at'
    ];

    public $id, $materia_id, $parcial_id, $nombre, $estado, $created_at, $updated_at;


    public function __construct($args = []) {
        $this->id = $args['id'] ?? null;
        $this->materia_id = $args['materia_id'] ?? null;
        $this->parcial_id = $args['parcial_id'] ?? null;
        $this->nombre = $args['nombre'] ?? '';
        $this->estado = $args['estado'] ?? 'activo';
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }

}
