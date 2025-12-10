<?php
namespace Middlewares;

use Controllers\LoginController;

class AuthMiddleware
{
    public static function handle($next, $router = null)
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            ini_set('session.cookie_httponly', 'On');
            if (function_exists('ensure_session')) {
                \ensure_session();
            } else {
                if (session_status() !== PHP_SESSION_ACTIVE) {
                    session_start();
                }
            }
        }

        if (!empty($_SESSION['login'])) {
            $next();
            return;
        }

        $token = $_COOKIE['auth_token'] ?? null;
        if (!$token) {
            http_response_code(401); exit('Unauthorized');
        }

        $userData = LoginController::validateToken($token);
        if (!$userData || empty($userData['login'])) {
            http_response_code(401); exit('Unauthorized');
        }

        $_SESSION['id']               = $userData['id'] ?? null;
        $_SESSION['correo']            = $userData['correo'] ?? null;
        $_SESSION['matricula']          = $userData['matricula'] ?? null;
        $_SESSION['nombre_completo']           = $userData['nombre_completo'] ?? null;
        $_SESSION['rol_id']              = isset($userData['rol_id']) ? (int)$userData['rol_id'] : null;
        $_SESSION['login']            = true;

        $env     = $_ENV['APP_ENV'] ?? 'dev';
        $domain  = $env === 'prod'
        ? ($_ENV['COOKIE_DOMAIN_PROD'] ?? '')
        : ($_ENV['COOKIE_DOMAIN_DEV'] ?? '');
        $secure  = $env === 'prod'
            ? (($_ENV['COOKIE_SECURE_PROD'] ?? 'true') === 'true')
            : (($_ENV['COOKIE_SECURE_DEV'] ?? 'false') === 'true');
        $sameSite = $_ENV['COOKIE_SAMESITE'] ?? 'Lax';

        $opts = [
            'expires'  => time() + (int)($_ENV['JWT_EXP_SECONDS'] ?? 86400),
            'path'     => '/',
            'secure'   => $secure,
            'httponly' => true,
            'samesite' => $sameSite,
        ];

        if (!empty($domain)) {
            $opts['domain'] = $domain;
        }

        setcookie('auth_token', $token, $opts);

        $next();
    }
}
