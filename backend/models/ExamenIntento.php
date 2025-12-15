<?php
namespace Model;

class ExamenIntento extends ActiveRecord {
    protected static $tabla = 'examen_intento';
    protected static $primaryKey = 'id';

    protected static $columnasDB = [
        'id', 'examen_id', 'inscripcion_id', 'intento_num', 'inicio_real', 'fin_real', 'estado', 'calif_auto', 'calif_manual', 'calif_final', 'created_at', 'updated_at'
    ];

    public $id, $examen_id, $inscripcion_id, $intento_num, $inicio_real, $fin_real, $estado, $calif_auto, $calif_manual, $calif_final, $created_at, $updated_at;

    public const PENDIENTE   = 'pendiente';
    public const EN_PROGRESO = 'en_progreso';
    public const ENVIADO     = 'enviado';
    public const REVISADO    = 'revisado';
    public const ANULADO     = 'anulado';


    public function __construct($args = []) {
        $this->id = $args['id'] ?? null;
        $this->examen_id = $args['examen_id'] ?? null;
        $this->inscripcion_id = $args['inscripcion_id'] ?? null;
        $this->intento_num = $args['intento_num'] ?? 1;
        $this->inicio_real = $args['inicio_real'] ?? null;
        $this->fin_real = $args['fin_real'] ?? null;
        $this->estado = $args['estado'] ?? 'pendiente';
        $this->calif_auto = $args['calif_auto'] ?? null;
        $this->calif_manual = $args['calif_manual'] ?? null;
        $this->calif_final = $args['calif_final'] ?? null;
        $this->created_at = $args['created_at'] ?? null;
        $this->updated_at = $args['updated_at'] ?? null;
    }

}
