<?php
namespace Model;

class AreaDocenteTc extends ActiveRecord {
    protected static $tabla = 'area_docente_tc';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'area_id','usuario_id','created_at','updated_at'
    ];

    public $id, $area_id, $usuario_id, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id         = $args['id'] ?? null; // placeholder
        $this->area_id    = $args['area_id'] ?? null;
        $this->usuario_id = $args['usuario_id'] ?? null;
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }
}
