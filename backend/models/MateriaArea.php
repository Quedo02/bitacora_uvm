<?php
namespace Model;

class MateriaArea extends ActiveRecord {
    protected static $tabla = 'materia_area';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'materia_id','area_id','es_estandarizable','estado','created_at','updated_at'
    ];

    public $id, $materia_id, $area_id, $es_estandarizable, $estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id               = $args['id'] ?? null; // placeholder
        $this->materia_id       = $args['materia_id'] ?? null;
        $this->area_id          = $args['area_id'] ?? null;
        $this->es_estandarizable= $args['es_estandarizable'] ?? 1;
        $this->estado           = $args['estado'] ?? 'activa';
        $this->created_at       = $args['created_at'] ?? null;
        $this->updated_at       = $args['updated_at'] ?? null;
    }
}
