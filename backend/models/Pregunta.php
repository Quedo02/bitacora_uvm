<?php
namespace Model;

class Pregunta extends ActiveRecord {
    protected static $tabla = 'pregunta';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'materia_id', 'creada_por_usuario_id', 'estado', 'version_actual_id', 'created_at', 'updated_at'
    ];

    public $id, $materia_id, $creada_por_usuario_id, $estado, $version_actual_id, $created_at, $updated_at;

    public const PENDIENTE = 'pendiente';
    public const REVISION  = 'revision';
    public const APROBADA  = 'aprobada';
    public const RECHAZADA = 'rechazada';
    public const ARCHIVADA = 'archivada';


    public function __construct($args = []) {
        $this->id = $args['id'] ?? null;
        $this->materia_id = $args['materia_id'] ?? null;
        $this->creada_por_usuario_id = $args['creada_por_usuario_id'] ?? null;
        $this->estado = $args['estado'] ?? 'pendiente';
        $this->version_actual_id = $args['version_actual_id'] ?? null;
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }

}
