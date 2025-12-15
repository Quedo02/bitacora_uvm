<?php
namespace Model;

class ExamenIntentoPregunta extends ActiveRecord {
    protected static $tabla = 'examen_intento_pregunta';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'examen_intento_id','pregunta_version_id','orden','opciones_orden_json'
    ];

    public $id, $examen_intento_id, $pregunta_version_id, $orden, $opciones_orden_json;

    public function __construct($args = []) {
        $this->id                 = $args['id'] ?? null;
        $this->examen_intento_id  = $args['examen_intento_id'] ?? null;
        $this->pregunta_version_id= $args['pregunta_version_id'] ?? null;
        $this->orden              = $args['orden'] ?? 1;
        $this->opciones_orden_json= $args['opciones_orden_json'] ?? null;
    }

}
