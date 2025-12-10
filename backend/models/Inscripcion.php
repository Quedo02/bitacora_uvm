<?php
namespace Model;

class Inscripcion extends ActiveRecord {
    protected static $tabla = 'inscripcion';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'seccion_id', 'estudiante_id', 'estado',
        'metodo', 'created_at', 'updated_at'
    ];

    public $id, $seccion_id, $estudiante_id, $estado,
           $metodo, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id            = $args['id'] ?? null;
        $this->seccion_id    = $args['seccion_id'] ?? null;
        $this->estudiante_id = $args['estudiante_id'] ?? null;
        $this->estado        = $args['estado'] ?? 'inscrito';
        $this->metodo        = $args['metodo'] ?? 'presencial';
        $this->created_at    = $args['created_at'] ?? null;
        $this->updated_at    = $args['updated_at'] ?? null;
    }
}
