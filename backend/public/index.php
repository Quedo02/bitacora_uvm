<?php
require_once __DIR__ . '/../includes/app.php';

use MVC\Router;
use Middlewares\CorsMiddleware;
use Middlewares\AuthMiddleware;
use Controllers\LoginController;
use Controllers\ApiController;
use Controllers\CoordinacionController;
use Controllers\DocenteController;
use Controllers\BancoController;
use Controllers\ExamenController;
use Controllers\ImportController;

$router = new Router();

$router->group(function (Router $router) {
  $router->use([CorsMiddleware::class . '::handle']);

  $router->options('/api/auth/login', function () {}, []);
  $router->options('/api/auth/user', function () {}, []);
  $router->options('/api/auth/logout', function () {}, []);
  $router->options('/api/config', function () {}, []);

  // Auth
  $router->post('/api/auth/login', [LoginController::class, 'index']);
  $router->get('/api/auth/user', [LoginController::class, 'getUserDataFromToken']);
  $router->post('/api/auth/logout', [LoginController::class, 'logout']);
});

$router->group(function (Router $router) {
  $router->use([
    CorsMiddleware::class . '::handle',
    AuthMiddleware::class . '::handle'
  ]);

  // CRUD genérico
  $router->options('/api/{modelo}', function () {}, []);
  $router->options('/api/{modelo}/{id}', function () {}, []);

  $router->post('/api/{modelo}', [ApiController::class, 'create']);
  $router->get('/api/{modelo}', [ApiController::class, 'get']);
  $router->put('/api/{modelo}/{id}', [ApiController::class, 'update']);
  $router->delete('/api/{modelo}/{id}', [ApiController::class, 'delete']);

  // Coordinación
  $router->options('/api/coordinacion/import/semestre', function () {}, []);
  $router->get('/api/coordinacion/dashboard', [CoordinacionController::class, 'getDashboard']);
  $router->get('/api/coordinacion/dashboard/{codigo_periodo}', [CoordinacionController::class, 'getDashboard']);

  $router->get('/api/coordinacion/alumnos-area', [CoordinacionController::class, 'getAlumnosArea']);

  $router->get('/api/coordinacion/docentes-area', [CoordinacionController::class, 'getDocentesArea']);
  $router->get('/api/coordinacion/docentes-area/{codigo_periodo}', [CoordinacionController::class, 'getDocentesArea']);

  $router->post('/api/coordinacion/import/semestre', [ImportController::class, 'importSemestre']);
  $router->get('/api/coordinacion/import/template', [ImportController::class, 'downloadTemplateExcel']);


  // Docente
  $router->get('/api/docente/clases', [DocenteController::class, 'getClases']);
  $router->get('/api/docente/clases/{codigo_periodo}', [DocenteController::class, 'getClases']);
  $router->get('/api/docente/clase/{seccion_id}', [DocenteController::class, 'getClaseDetalle']);

  // ===== BANCO =====
  $router->options('/api/banco/{recurso}', function () {}, []);
  $router->options('/api/banco/{recurso}/{id}', function () {}, []);
  $router->options('/api/banco/{recurso}/{id}/{sub}', function () {}, []);

  $router->get('/api/banco/materias', [BancoController::class, 'getMateriasPermitidas']);
  $router->get('/api/banco/materia/{materia_id}/temas', [BancoController::class, 'getTemasMateria']);
  $router->post('/api/banco/materia/{materia_id}/temas', [BancoController::class, 'createTema']);
  $router->put('/api/banco/tema/{tema_id}', [BancoController::class, 'updateTema']);
  $router->delete('/api/banco/tema/{tema_id}', [BancoController::class, 'deleteTema']);

  $router->get('/api/banco/preguntas', [BancoController::class, 'getPreguntas']);
  $router->post('/api/banco/preguntas', [BancoController::class, 'createPregunta']);
  $router->get('/api/banco/pregunta/{pregunta_id}', [BancoController::class, 'getPreguntaDetalle']);
  $router->post('/api/banco/pregunta/{pregunta_id}/version', [BancoController::class, 'createVersion']);
  $router->get('/api/banco/pregunta/{pregunta_id}/versiones', [BancoController::class, 'getVersiones']);

  $router->get('/api/banco/aprobaciones/pendientes', [BancoController::class, 'getPendientesAprobar']);
  $router->post('/api/banco/version/{pregunta_version_id}/voto', [BancoController::class, 'votarVersion']);
  $router->get('/api/banco/version/{pregunta_version_id}/votos', [BancoController::class, 'getVotosVersion']);

  $router->delete('/api/banco/pregunta/{pregunta_id}', [BancoController::class, 'deletePregunta']); // admin

  // ===== EXAMENES =====
  $router->options('/api/examenes/{recurso}', function () {}, []);
  $router->options('/api/examenes/{recurso}/{id}', function () {}, []);
  $router->options('/api/examenes/{recurso}/{id}/{sub}', function () {}, []);
  $router->options('/api/examenes/examen/{examen_id}/pregunta/{pregunta_version_id}', function () {}, []);

  $router->get('/api/examenes/seccion/{seccion_id}', [ExamenController::class, 'getExamenesSeccion']);
  $router->post('/api/examenes/seccion/{seccion_id}', [ExamenController::class, 'createExamen']);

  $router->get('/api/examenes/examen/{examen_id}', [ExamenController::class, 'getExamenDetalle']);
  $router->put('/api/examenes/examen/{examen_id}', [ExamenController::class, 'updateExamen']);
  $router->delete('/api/examenes/examen/{examen_id}', [ExamenController::class, 'deleteExamen']);
  
  $router->post('/api/examenes/examen/{examen_id}/armar', [ExamenController::class, 'armarExamen']);
  $router->post('/api/examenes/examen/{examen_id}/publicar', [ExamenController::class, 'publicarExamen']);
  $router->post('/api/examenes/examen/{examen_id}/cerrar', [ExamenController::class, 'cerrarExamen']);
  
  $router->get('/api/examenes/mis-examenes', [ExamenController::class, 'getMisExamenes']);
  $router->post('/api/examenes/examen/{examen_id}/iniciar', [ExamenController::class, 'iniciarIntento']);
  $router->post('/api/examenes/intento/{intento_id}/responder', [ExamenController::class, 'guardarRespuesta']);
  $router->post('/api/examenes/intento/{intento_id}/finalizar', [ExamenController::class, 'finalizarIntento']);
  $router->get('/api/examenes/intento/{intento_id}', [ExamenController::class, 'getIntento']);
  
  $router->get('/api/examenes/examen/{examen_id}/intentos', [ExamenController::class, 'getIntentosExamen']);
  $router->get('/api/examenes/intento/{intento_id}/detalle', [ExamenController::class, 'getIntentoDetalle']);
  $router->post('/api/examenes/intento/{intento_id}/calificar', [ExamenController::class, 'calificarIntento']);
  $router->post('/api/examenes/intento/{intento_id}/aplicar-bitacora', [ExamenController::class, 'aplicarCalificacionBitacora']);
  
  $router->put('/api/examenes/examen/{examen_id}/pregunta/{pregunta_version_id}', [ExamenController::class, 'updatePuntosPregunta']);
  $router->delete('/api/examenes/examen/{examen_id}/pregunta/{pregunta_version_id}', [ExamenController::class, 'deletePreguntaExamen']);
});

$router->comprobarRutas();
