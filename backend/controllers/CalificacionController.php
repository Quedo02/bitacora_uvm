<?php

namespace Controllers;

use Model\Examen;
use Model\ExamenIntento;
use Model\Inscripcion;
use Model\CalificacionExamenParcial;
use Model\CalificacionExamenFinal;

/**
 * Controlador para gestionar calificaciones de exámenes
 * y su integración con la bitácora académica
 */
class CalificacionController
{
    /**
     * Guarda la calificación de un examen en la bitácora
     * Se ejecuta automáticamente cuando un examen se cierra
     * 
     * @param int $examenId ID del examen
     * @return array Resultado de la operación
     */
    public static function guardarCalificacionesBitacora(int $examenId): array
    {
        try {
            // Obtener el examen
            $examen = Examen::find($examenId);
            if (!$examen) {
                return ['resultado' => false, 'error' => 'Examen no encontrado'];
            }

            // Validar que el examen esté cerrado
            if ($examen->estado !== 'cerrado') {
                return [
                    'resultado' => false, 
                    'error' => 'El examen debe estar cerrado para guardar calificaciones'
                ];
            }

            // Obtener todos los intentos del examen
            $intentos = ExamenIntento::SQL("
                SELECT ei.*, i.estudiante_id, i.id AS inscripcion_id
                FROM examen_intento ei
                JOIN inscripcion i ON i.id = ei.inscripcion_id
                WHERE ei.examen_id = {$examenId}
                  AND ei.estado IN ('enviado', 'revisado')
                  AND i.estado = 'inscrito'
            ");

            if (empty($intentos)) {
                return [
                    'resultado' => true,
                    'mensaje' => 'No hay intentos para procesar',
                    'procesados' => 0
                ];
            }

            // Agrupar intentos por inscripción y obtener el mejor intento de cada alumno
            $mejoresIntentos = [];
            foreach ($intentos as $intento) {
                $inscId = (int)$intento->inscripcion_id;
                $calif = (float)($intento->calif_final ?? $intento->calif_auto ?? 0);
                
                if (!isset($mejoresIntentos[$inscId]) || $calif > $mejoresIntentos[$inscId]['calif']) {
                    $mejoresIntentos[$inscId] = [
                        'inscripcion_id' => $inscId,
                        'calif' => $calif
                    ];
                }
            }

            $procesados = 0;
            $errores = [];

            // Guardar calificaciones según el tipo de examen
            foreach ($mejoresIntentos as $mejor) {
                $inscId = $mejor['inscripcion_id'];
                $calif = round($mejor['calif'], 2);

                try {
                    if ($examen->tipo === 'parcial') {
                        // Guardar en calificacion_examen_parcial
                        self::guardarCalifParcial($inscId, (int)$examen->parcial_id, $calif);
                    } else {
                        // Guardar en calificacion_examen_final
                        self::guardarCalifFinal($inscId, $calif);
                    }
                    $procesados++;
                } catch (\Exception $e) {
                    $errores[] = "Inscripción {$inscId}: " . $e->getMessage();
                }
            }

            return [
                'resultado' => true,
                'mensaje' => "Calificaciones guardadas exitosamente",
                'procesados' => $procesados,
                'total' => count($mejoresIntentos),
                'errores' => $errores
            ];

        } catch (\Exception $e) {
            return [
                'resultado' => false,
                'error' => 'Error al guardar calificaciones: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Guarda o actualiza la calificación de un examen parcial
     */
    private static function guardarCalifParcial(int $inscripcionId, int $parcialId, float $calificacion): void
    {
        // Buscar si ya existe
        $existente = CalificacionExamenParcial::SQL("
            SELECT * FROM calificacion_examen_parcial 
            WHERE inscripcion_id = {$inscripcionId} 
              AND parcial_id = {$parcialId}
            LIMIT 1
        ");

        if (!empty($existente)) {
            // Actualizar
            CalificacionExamenParcial::SQL("
                UPDATE calificacion_examen_parcial 
                SET calificacion = {$calificacion},
                    updated_at = NOW()
                WHERE inscripcion_id = {$inscripcionId} 
                  AND parcial_id = {$parcialId}
            ");
        } else {
            // Crear nuevo
            $calif = new CalificacionExamenParcial([
                'inscripcion_id' => $inscripcionId,
                'parcial_id' => $parcialId,
                'calificacion' => $calificacion
            ]);
            $calif->crear();
        }
    }

    /**
     * Guarda o actualiza la calificación de un examen final
     */
    private static function guardarCalifFinal(int $inscripcionId, float $calificacion): void
    {
        // Buscar si ya existe
        $existente = CalificacionExamenFinal::SQL("
            SELECT * FROM calificacion_examen_final 
            WHERE inscripcion_id = {$inscripcionId}
            LIMIT 1
        ");

        if (!empty($existente)) {
            // Actualizar
            CalificacionExamenFinal::SQL("
                UPDATE calificacion_examen_final 
                SET calificacion = {$calificacion},
                    updated_at = NOW()
                WHERE inscripcion_id = {$inscripcionId}
            ");
        } else {
            // Crear nuevo
            $calif = new CalificacionExamenFinal([
                'inscripcion_id' => $inscripcionId,
                'calificacion' => $calificacion
            ]);
            $calif->crear();
        }
    }

    /**
     * Elimina las calificaciones de un examen de la bitácora
     * Útil si se necesita reabrir o anular un examen
     */
    public static function eliminarCalificacionesBitacora(int $examenId): array
    {
        try {
            $examen = Examen::find($examenId);
            if (!$examen) {
                return ['resultado' => false, 'error' => 'Examen no encontrado'];
            }

            // Obtener todas las inscripciones del examen
            $inscripciones = Inscripcion::SQL("
                SELECT i.id 
                FROM inscripcion i
                WHERE i.seccion_id = {$examen->seccion_id}
                  AND i.estado = 'inscrito'
            ");

            $eliminados = 0;

            foreach ($inscripciones as $insc) {
                $inscId = (int)$insc->id;

                if ($examen->tipo === 'parcial') {
                    CalificacionExamenParcial::SQL("
                        DELETE FROM calificacion_examen_parcial 
                        WHERE inscripcion_id = {$inscId} 
                          AND parcial_id = {$examen->parcial_id}
                    ");
                } else {
                    CalificacionExamenFinal::SQL("
                        DELETE FROM calificacion_examen_final 
                        WHERE inscripcion_id = {$inscId}
                    ");
                }
                $eliminados++;
            }

            return [
                'resultado' => true,
                'mensaje' => 'Calificaciones eliminadas',
                'eliminados' => $eliminados
            ];

        } catch (\Exception $e) {
            return [
                'resultado' => false,
                'error' => 'Error al eliminar calificaciones: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Recalcula y actualiza las calificaciones de un examen en la bitácora
     * Útil después de recalificar intentos
     */
    public static function recalcularCalificacionesBitacora(int $examenId): array
    {
        try {
            // Primero eliminar las existentes
            $resultEliminar = self::eliminarCalificacionesBitacora($examenId);
            if (!$resultEliminar['resultado']) {
                return $resultEliminar;
            }

            // Luego guardar las nuevas
            return self::guardarCalificacionesBitacora($examenId);

        } catch (\Exception $e) {
            return [
                'resultado' => false,
                'error' => 'Error al recalcular: ' . $e->getMessage()
            ];
        }
    }
}