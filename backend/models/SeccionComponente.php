<?php
namespace Model;

class SeccionComponente extends ActiveRecord {
    protected static $tabla = 'seccion_componente';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'seccion_id', 'tipo', 'crn',
        'peso_porcentaje', 'estado', 'created_at', 'updated_at'
    ];

    public $id, $seccion_id, $tipo, $crn,
           $peso_porcentaje, $estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id              = $args['id'] ?? null;
        $this->seccion_id      = $args['seccion_id'] ?? null;
        $this->tipo            = $args['tipo'] ?? '';
        $this->crn             = $args['crn'] ?? '';
        $this->peso_porcentaje = $args['peso_porcentaje'] ?? null;
        $this->estado          = $args['estado'] ?? 'activo';
        $this->created_at      = $args['created_at'] ?? null;
        $this->updated_at      = $args['updated_at'] ?? null;
    }

    public const CONTINUA = 'continua';
    public const BLACKBOARD = 'blackboard';
    public const EXAMEN = 'examen';
}
