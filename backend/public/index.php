<?php
require_once __DIR__ . '/../includes/app.php';

use MVC\Router;
use Middlewares\CorsMiddleware;
use Middlewares\AuthMiddleware;
use Controllers\LoginController;
use Controllers\ApiController;
use Controllers\CoordinacionController;
use Controllers\DocenteController;

$router = new Router();

$router->group(function(Router $router){
  $router->use([CorsMiddleware::class . '::handle']);

  $router->options('/api/auth/login', function(){}, []);
  $router->options('/api/auth/user', function(){}, []);
  $router->options('/api/auth/logout', function(){}, []);
  $router->options('/api/config', function(){}, []);

  // Auth
  $router->post('/api/auth/login', [LoginController::class, 'index']);
  $router->get('/api/auth/user', [LoginController::class, 'getUserDataFromToken']);
  $router->post('/api/auth/logout', [LoginController::class, 'logout']);
});

$router->group(function(Router $router){
  $router->use([
    CorsMiddleware::class . '::handle',
    AuthMiddleware::class . '::handle'
  ]);

  // CRUD genérico
  $router->options('/api/{modelo}', function(){}, []);
  $router->options('/api/{modelo}/{id}', function(){}, []);

  $router->post('/api/{modelo}', [ApiController::class, 'create']);
  $router->get('/api/{modelo}', [ApiController::class, 'get']);
  $router->put('/api/{modelo}/{id}', [ApiController::class, 'update']);
  $router->delete('/api/{modelo}/{id}', [ApiController::class, 'delete']);

  // Coordinación
  $router->get('/api/coordinacion/dashboard', [CoordinacionController::class, 'getDashboard']);
  $router->get('/api/coordinacion/dashboard/{codigo_periodo}', [CoordinacionController::class, 'getDashboard']);

  $router->get('/api/coordinacion/alumnos-area', [CoordinacionController::class, 'getAlumnosArea']);

  $router->get('/api/coordinacion/docentes-area', [CoordinacionController::class, 'getDocentesArea']);
  $router->get('/api/coordinacion/docentes-area/{codigo_periodo}', [CoordinacionController::class, 'getDocentesArea']);

  // Docente
  $router->get('/api/docente/clases', [DocenteController::class, 'getClases']);
  $router->get('/api/docente/clases/{codigo_periodo}', [DocenteController::class, 'getClases']);
  $router->get('/api/docente/clase/{seccion_id}', [DocenteController::class, 'getClaseDetalle']);

});

$router->comprobarRutas();
