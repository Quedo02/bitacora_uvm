<?php
namespace Model;

class CarreraMateria extends ActiveRecord {
    protected static $tabla = 'carrera_materia';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'carrera_id', 'materia_id', 'num_semestre',
        'estado', 'created_at', 'updated_at'
    ];

    public $id, $carrera_id, $materia_id, $num_semestre,
           $estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id           = $args['id'] ?? null;
        $this->carrera_id   = $args['carrera_id'] ?? null;
        $this->materia_id   = $args['materia_id'] ?? null;
        $this->num_semestre = $args['num_semestre'] ?? null;
        $this->estado       = $args['estado'] ?? 'activa';
        $this->created_at   = $args['created_at'] ?? null;
        $this->updated_at   = $args['updated_at'] ?? null;
    }
}
