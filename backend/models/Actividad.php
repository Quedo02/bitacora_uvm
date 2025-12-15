<?php
namespace Model;

class Actividad extends ActiveRecord {
    protected static $tabla = 'actividad';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'seccion_id', 'parcial_id','componente','origen','nombre','peso_en_componente','referencia_externa','estado', 'created_at', 'updated_at'
    ];

    public $id, $seccion_id, $parcial_id,$componente,$origen,$nombre,$peso_en_componente,$referencia_externa,$estado, $created_at, $updated_at;

    public function __construct($args = []) {
        $this->id            = $args['id'] ?? null;
        $this->seccion_id    = $args['seccion_id'] ?? null;
        $this->parcial_id = $args['parcial_id'] ?? null;
        $this->componente = $args['componente'] ?? null;
        $this->origen = $args['origen'] ?? null;
        $this->nombre = $args['nombre'] ?? null;
        $this->peso_en_componente = $args['peso_en_componente'] ?? null;
        $this->referencia_externa = $args['referencia_externa'] ?? null;
        $this->estado = $args['estado'] ?? null;
        $this->created_at    = $args['created_at'] ?? null;
        $this->updated_at    = $args['updated_at'] ?? null;
    }
}
