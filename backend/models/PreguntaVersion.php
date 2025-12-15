<?php
namespace Model;

class PreguntaVersion extends ActiveRecord {
    protected static $tabla = 'pregunta_version';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'pregunta_id', 'version_num', 'tipo', 'enunciado', 'dificultad', 'scope', 'parcial_id', 'contenido_json', 'respuesta_json', 'estado', 'created_by', 'created_at', 'updated_at'
    ];

    public $id, $pregunta_id, $version_num, $tipo, $enunciado, $dificultad, $scope, $parcial_id, $contenido_json, $respuesta_json, $estado, $created_by, $created_at, $updated_at;

    public const T_OPCION_MULTIPLE  = 'opcion_multiple';
    public const T_VERDADERO_FALSO  = 'verdadero_falso';
    public const T_ABIERTA          = 'abierta';
    public const T_RELACIONAR       = 'relacionar';
    public const T_ORDENAR          = 'ordenar';
    public const T_COMPLETAR        = 'completar';
    public const T_NUMERICA         = 'numerica';

    public const SCOPE_PARCIAL = 'parcial';
    public const SCOPE_FINAL   = 'final';


    public function __construct($args = []) {
        $this->id = $args['id'] ?? null;
        $this->pregunta_id = $args['pregunta_id'] ?? null;
        $this->version_num = $args['version_num'] ?? 1;
        $this->tipo = $args['tipo'] ?? '';
        $this->enunciado = $args['enunciado'] ?? '';
        $this->dificultad = $args['dificultad'] ?? 1;
        $this->scope = $args['scope'] ?? 'parcial';
        $this->parcial_id = $args['parcial_id'] ?? null;
        $this->contenido_json = $args['contenido_json'] ?? '{}';
        $this->respuesta_json = $args['respuesta_json'] ?? '{}';
        $this->estado = $args['estado'] ?? 'pendiente';
        $this->created_by = $args['created_by'] ?? null;
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }

}
