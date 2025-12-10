<?php
namespace Model;

class DocenteProfile extends ActiveRecord {
    protected static $tabla = 'docente_profile';
    protected static $primaryKey = 'usuario_id';

    protected static $columnasDB = [
        'usuario_id', 'categoria','created_at', 'updated_at'
    ];

    public $usuario_id, $categoria, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->usuario_id = $args['usuario_id'] ?? null;
        $this->categoria  = $args['categoria'] ?? 'general';
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }
}
