<?php
namespace Model;

class CalificacionActividad extends ActiveRecord {
    protected static $tabla = 'calificacion_actividad';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'actividad_id', 'inscripcion_id','calificacion', 'created_at', 'updated_at'
    ];

    public $id, $actividad_id, $inscripcion_id,$calificacion,$created_at, $updated_at;

    public function __construct($args = []) {
        $this->id            = $args['id'] ?? null;
        $this->actividad_id    = $args['actividad_id'] ?? null;
        $this->inscripcion_id = $args['inscripcion_id'] ?? null;
        $this->calificacion = $args['calificacion'] ?? null;
        $this->created_at    = $args['created_at'] ?? null;
        $this->updated_at    = $args['updated_at'] ?? null;
    }
}
