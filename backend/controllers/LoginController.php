<?php
namespace Controllers;

use \Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Model\Usuario;

class LoginController {
    private static $secret_key;
    private const ENCRYPT_METHOD = 'HS256';

    public static function init() {
        self::$secret_key = $_ENV['jwt_secret_key'];
    }

    private static function startSession(): void {
        if (function_exists('ensure_session')) {
            \ensure_session();
            return;
        }
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
    }


    public static function index() {
        self::init();
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $identifier = $data['user'] ?? $data['username'] ?? $data['correo'] ?? $data['matricula'] ?? null;
        $password   = $data['password'] ?? null;

        if (!$identifier || !$password) {
            http_response_code(400);
            echo json_encode(['code'=>400,'response'=>'Username/correo y password son requeridos']);
            exit;
        }

        $user = Usuario::findByLoginIdentifier($identifier);
        if (!$user || $user->estado === 'inactivo') {
            http_response_code(401); echo json_encode(['code'=>401,'response'=>'Credenciales inválidas']); exit;
        }


        $ok = password_verify($password, $user->password_hash ?? '');
        if (!$ok) {
            http_response_code(401); echo json_encode(['code'=>401,'response'=>'Credenciales inválidas']); exit;
        }

        $exp = (int)($_ENV['JWT_EXP_SECONDS'] ?? 86400);
        $payload = [
            'iat'              => time(),
            'exp'              => time() + $exp,
            'id'               => $user->id,
            'correo'            => $user->correo,
            'matricula'          => $user->matricula,
            'nombre_completo'           => $user->nombre_completo,
            'rol_id'              => isset($user->rol_id) ? (int)$user->rol_id : null,
            'login'            => true
        ];
        $token = JWT::encode($payload, self::$secret_key, self::ENCRYPT_METHOD);
        self::setAuthCookie($token);
        self::startSession();
        session_regenerate_id(true);
        $_SESSION['id']               = $payload['id'];
        $_SESSION['correo']            = $payload['correo'];
        $_SESSION['matricula']          = $payload['matricula'];
        $_SESSION['nombre_completo']           = $payload['nombre_completo'];
        $_SESSION['rol_id']              = $payload['rol_id'];
        $_SESSION['login']            = true;

        echo json_encode(['code'=>200,'response'=>[
            'id'=>$user->id,'nombre_completo'=>$user->nombre_completo,'correo'=>$user->correo, 'rol_id'=>$user->rol_id
        ]]); exit;
    }

    public static function validateToken($token) {
        self::init();
        try {
            $decoded = JWT::decode($token, new Key(self::$secret_key, self::ENCRYPT_METHOD));
            return (array)$decoded;
        } catch (\Exception $e) {
            return null;
        }
    }

    public static function getUserDataFromToken() {
        self::startSession();

        if (!empty($_SESSION['login'])) {
            echo json_encode(['code'=>200,'response'=>[
                'id' => $_SESSION['id'] ?? null,
                'correo' => $_SESSION['correo'] ?? null,
                'nombre_completo' => $_SESSION['nombre_completo'] ?? null,
                'rol_id' => $_SESSION['rol_id'] ?? null,
                'login' => true
            ]]); exit;
        }

        $token = $_COOKIE['auth_token'] ?? null;
        if (!$token) { http_response_code(401); echo json_encode(['code'=>401,'response'=>'No token provided']); exit; }

        $d = self::validateToken($token);
        if ($d && !empty($d['login'])) {
            $_SESSION['id'] = $d['id'] ?? null;
            $_SESSION['correo'] = $d['correo'] ?? null;
            $_SESSION['matricula'] = $d['matricula'] ?? null;
            $_SESSION['nombre_completo'] = $d['nombre_completo'] ?? null;
            $_SESSION['rol_id'] = isset($d['rol_id']) ? (int)$d['rol_id'] : null;
            $_SESSION['login'] = true;

            echo json_encode(['code'=>200,'response'=>[
                'id' => $_SESSION['id'],
                'correo' => $_SESSION['correo'],
                'matricula' => $_SESSION['matricula'],
                'nombre_completo' => $_SESSION['nombre_completo'],
                'rol_id' => $_SESSION['rol_id'],
                'login' => true
            ]]); exit;
        }

        http_response_code(401); echo json_encode(['code'=>401,'response'=>'Invalid token']); exit;
    }


    public static function logout() {
        self::startSession();
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time()-42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
        }
        session_destroy();

        setcookie('auth_token','', time()-3600, '/');
        echo json_encode(['code'=>200,'response'=>'ok']); exit;
    }

    private static function setAuthCookie($token) {
        $env = $_ENV['APP_ENV'] ?? 'dev';
        $domain = $env === 'prod'
        ? ($_ENV['COOKIE_DOMAIN_PROD'] ?? '')
        : ($_ENV['COOKIE_DOMAIN_DEV'] ?? '');
        $secure = $env === 'prod'
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

        setcookie("auth_token", $token, $opts);
    }
}
