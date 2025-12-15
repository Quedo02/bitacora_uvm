<?php
namespace Model;

class CalificacionExamenParcial extends ActiveRecord {
    protected static $tabla = 'calificacion_examen_parcial';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'inscripcion_id', 'parcial_id', 'calificacion', 'created_at', 'updated_at'
    ];

    public $id, $parcial_id, $inscripcion_id,$calificacion,$created_at, $updated_at;

    public function __construct($args = []) {
        $this->id            = $args['id'] ?? null;
        $this->inscripcion_id = $args['inscripcion_id'] ?? null;
        $this->parcial_id    = $args['parcial_id'] ?? null;
        $this->calificacion = $args['calificacion'] ?? null;
        $this->created_at    = $args['created_at'] ?? null;
        $this->updated_at    = $args['updated_at'] ?? null;
    }
}
