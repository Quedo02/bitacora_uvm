<?php
namespace Model;

class PreguntaVersionTema extends ActiveRecord {
    protected static $tabla = 'pregunta_version_tema';
    protected static $primaryKey = 'id'; // placeholder

    protected static $columnasDB = [
        'pregunta_version_id','tema_id'
    ];

    public $id, $pregunta_version_id, $tema_id;

    public function __construct($args = []) {
        $this->id                  = $args['id'] ?? null;
        $this->pregunta_version_id = $args['pregunta_version_id'] ?? null;
        $this->tema_id             = $args['tema_id'] ?? null;
    }

}
