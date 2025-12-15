<?php
namespace Model;

class PreguntaVersionArea extends ActiveRecord {
    protected static $tabla = 'pregunta_version_area';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'pregunta_version_id','area_id'
    ];

    public $id, $pregunta_version_id, $area_id;

    public function __construct($args = []) {
        $this->id                  = $args['id'] ?? null;
        $this->pregunta_version_id = $args['pregunta_version_id'] ?? null;
        $this->area_id             = $args['area_id'] ?? null;
    }

}
