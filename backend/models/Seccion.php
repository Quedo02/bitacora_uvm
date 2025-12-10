<?php
namespace Model;

class Seccion extends ActiveRecord {
    protected static $tabla = 'seccion';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'materia_id', 'carrera_id', 'periodo_id', 'grupo',
        'docente_id', 'modalidad', 'estado', 'created_at', 'updated_at'
    ];

    public $id, $materia_id, $carrera_id, $periodo_id, $grupo,
           $docente_id, $modalidad, $estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id         = $args['id'] ?? null;
        $this->materia_id = $args['materia_id'] ?? null;
        $this->carrera_id = $args['carrera_id'] ?? null;
        $this->periodo_id = $args['periodo_id'] ?? null;
        $this->grupo      = $args['grupo'] ?? '';
        $this->docente_id = $args['docente_id'] ?? null;
        $this->modalidad  = $args['modalidad'] ?? 'presencial';
        $this->estado     = $args['estado'] ?? 'activa';
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }
}
