<?php
namespace Model;

class ExamenRespuesta extends ActiveRecord {
    protected static $tabla = 'examen_respuesta';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'examen_intento_id', 'pregunta_version_id', 'respuesta_json', 'respuesta_texto', 'puntaje_auto', 'puntaje_manual', 'estado_revision', 'feedback', 'created_at', 'updated_at'
    ];

    public $id, $examen_intento_id, $pregunta_version_id, $respuesta_json, $respuesta_texto, $puntaje_auto, $puntaje_manual, $estado_revision, $feedback, $created_at, $updated_at;

    public const REV_PENDIENTE = 'pendiente';
    public const REV_REVISADA  = 'revisada';


    public function __construct($args = []) {
        $this->id = $args['id'] ?? null;
        $this->examen_intento_id = $args['examen_intento_id'] ?? null;
        $this->pregunta_version_id = $args['pregunta_version_id'] ?? null;
        $this->respuesta_json = $args['respuesta_json'] ?? null;
        $this->respuesta_texto = $args['respuesta_texto'] ?? null;
        $this->puntaje_auto = $args['puntaje_auto'] ?? null;
        $this->puntaje_manual = $args['puntaje_manual'] ?? null;
        $this->estado_revision = $args['estado_revision'] ?? 'pendiente';
        $this->feedback = $args['feedback'] ?? null;
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }

}
