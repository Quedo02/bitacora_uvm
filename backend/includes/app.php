<?php
require_once __DIR__ . '/../vendor/autoload.php';
date_default_timezone_set('America/Mexico_City');

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

use Model\ActiveRecord;
use Classes\Connection;

$database = new Connection();
ActiveRecord::setDB($database->startConn());

function ensure_session(): void{
    if (session_status() === PHP_SESSION_ACTIVE) return;

    $env    = $_ENV['APP_ENV'] ?? 'dev';
    $domain = $env === 'prod'
        ? ($_ENV['COOKIE_DOMAIN_PROD'] ?? '')
        : ($_ENV['COOKIE_DOMAIN_DEV'] ?? '');

    $secure = $env === 'prod'
        ? (($_ENV['COOKIE_SECURE_PROD'] ?? 'true') === 'true')
        : (($_ENV['COOKIE_SECURE_DEV'] ?? 'false') === 'true');

    $same   = $_ENV['COOKIE_SAMESITE'] ?? 'Lax';

    $params = [
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => $same,
    ];

    if (!empty($domain)) {
        $params['domain'] = $domain;
    }

    session_set_cookie_params($params);
    session_start();
}