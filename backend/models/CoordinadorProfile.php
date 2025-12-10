<?php
namespace Model;

class CoordinadorProfile extends ActiveRecord {
    protected static $tabla = 'coordinador_profile';
    protected static $primaryKey = 'usuario_id';

    protected static $columnasDB = [
        'usuario_id', 'area_id', 'created_at', 'updated_at'
    ];

    public $usuario_id, $area_id, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->usuario_id = $args['usuario_id'] ?? null;
        $this->area_id    = $args['area_id'] ?? null;
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }
}
