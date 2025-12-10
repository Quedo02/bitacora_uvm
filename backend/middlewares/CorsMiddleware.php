<?php
namespace Middlewares;

class CorsMiddleware
{
  public static function handle($next, $router = null)
  {
    $env = $_ENV['APP_ENV'] ?? 'dev';
    $allowCreds = true;

    $origin = $env === 'dev'
      ? ($_ENV['FRONTEND_URL_DEV'] ?? 'http://localhost:3000')
      : ($_ENV['FRONTEND_URL_PROD'] ?? 'https://example.com');

    header("Access-Control-Allow-Origin: {$origin}");
    header("Vary: Origin");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    if ($allowCreds) header("Access-Control-Allow-Credentials: true");

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
      http_response_code(200);
      exit();
    }

    $next();
  }
}
