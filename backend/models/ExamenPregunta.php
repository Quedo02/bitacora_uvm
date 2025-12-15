<?php
namespace Model;

class ExamenPregunta extends ActiveRecord {
    protected static $tabla = 'examen_pregunta';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'examen_id','pregunta_version_id','puntos','orden_base'
    ];

    public $id, $examen_id, $pregunta_version_id, $puntos, $orden_base;

    public function __construct($args = []) {
        $this->id                 = $args['id'] ?? null;
        $this->examen_id          = $args['examen_id'] ?? null;
        $this->pregunta_version_id= $args['pregunta_version_id'] ?? null;
        $this->puntos             = $args['puntos'] ?? 1.00;
        $this->orden_base         = $args['orden_base'] ?? 1;
    }

}
