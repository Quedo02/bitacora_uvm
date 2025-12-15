<?php
namespace Model;

class PreguntaVoto extends ActiveRecord {
    protected static $tabla = 'pregunta_voto';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'pregunta_version_id', 'area_id', 'votante_id', 'decision', 'comentario', 'created_at', 'updated_at'
    ];

    public $id, $pregunta_version_id, $area_id, $votante_id, $decision, $comentario, $created_at, $updated_at;

    public const APROBAR  = 'aprobar';
    public const RECHAZAR = 'rechazar';
    public const REVISION = 'revision';


    public function __construct($args = []) {
        $this->id = $args['id'] ?? null;
        $this->pregunta_version_id = $args['pregunta_version_id'] ?? null;
        $this->area_id = $args['area_id'] ?? null;
        $this->votante_id = $args['votante_id'] ?? null;
        $this->decision = $args['decision'] ?? '';
        $this->comentario = $args['comentario'] ?? null;
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }

}
