<?php
namespace Model;

class SeccionParcialConfig extends ActiveRecord {
    protected static $tabla = 'seccion_parcial_config';
    protected static $primaryKey = 'seccion_id';

    protected static $columnasDB = [
        'seccion_id', 'parcial_id', 'peso_semestre', 'created_at', 'updated_at'
    ];

    public $seccion_id, $parcial_id, $peso_semestre, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->seccion_id            = $args['seccion_id'] ?? null;
        $this->parcial_id    = $args['parcial_id'] ?? null;
        $this->peso_semestre = $args['peso_semestre'] ?? null;
        $this->created_at    = $args['created_at'] ?? null;
        $this->updated_at    = $args['updated_at'] ?? null;
    }
}
