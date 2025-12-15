<?php
namespace Model;

class Examen extends ActiveRecord {
    protected static $tabla = 'examen';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'seccion_id', 'materia_id', 'creado_por', 'tipo', 'parcial_id', 'fecha_inicio', 'duracion_min', 'intentos_max', 'modo_armado', 'num_preguntas', 'dificultad_min', 'dificultad_max', 'mezclar_preguntas', 'mezclar_opciones', 'estado', 'created_at', 'updated_at'
    ];

    public $id, $seccion_id, $materia_id, $creado_por, $tipo, $parcial_id, $fecha_inicio, $duracion_min, $intentos_max, $modo_armado, $num_preguntas, $dificultad_min, $dificultad_max, $mezclar_preguntas, $mezclar_opciones, $estado, $created_at, $updated_at;

    public const TIPO_PARCIAL = 'parcial';
    public const TIPO_FINAL   = 'final';

    public const ARMADO_MANUAL = 'manual';
    public const ARMADO_RANDOM = 'random';

    public const BORRADOR   = 'borrador';
    public const PROGRAMADO = 'programado';
    public const ACTIVO     = 'activo';
    public const CERRADO    = 'cerrado';
    public const ARCHIVADO  = 'archivado';


    public function __construct($args = []) {
        $this->id = $args['id'] ?? null;
        $this->seccion_id = $args['seccion_id'] ?? null;
        $this->materia_id = $args['materia_id'] ?? null;
        $this->creado_por = $args['creado_por'] ?? null;
        $this->tipo = $args['tipo'] ?? 'parcial';
        $this->parcial_id = $args['parcial_id'] ?? null;
        $this->fecha_inicio = $args['fecha_inicio'] ?? null;
        $this->duracion_min = $args['duracion_min'] ?? 60;
        $this->intentos_max = $args['intentos_max'] ?? 1;
        $this->modo_armado = $args['modo_armado'] ?? 'random';
        $this->num_preguntas = $args['num_preguntas'] ?? 10;
        $this->dificultad_min = $args['dificultad_min'] ?? 1;
        $this->dificultad_max = $args['dificultad_max'] ?? 10;
        $this->mezclar_preguntas = $args['mezclar_preguntas'] ?? 1;
        $this->mezclar_opciones = $args['mezclar_opciones'] ?? 1;
        $this->estado = $args['estado'] ?? 'borrador';
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }

}
