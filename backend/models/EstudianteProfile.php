<?php
namespace Model;

class EstudianteProfile extends ActiveRecord {
    protected static $tabla = 'estudiante_profile';
    protected static $primaryKey = 'usuario_id';

    protected static $columnasDB = [
        'usuario_id', 'carrera_id', 'created_at', 'updated_at'
    ];

    public $usuario_id, $carrera_id, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->usuario_id = $args['usuario_id'] ?? null;
        $this->carrera_id = $args['carrera_id'] ?? null;
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }
}
