<?php
namespace MVC;

class Router
{
    private array $routes = [
        'GET' => [], 'POST' => [], 'PUT' => [], 'DELETE' => [], 'PATCH' => [], 'OPTIONS' => [],
    ];

    private array $globalMiddleware = [];

    public function __construct() {}

    public function use(array $middleware)
    {
        $this->globalMiddleware = array_merge($this->globalMiddleware, $middleware);
        return $this;
    }

    public function group(callable $callback, array $middleware = [])
    {
        $prev = $this->globalMiddleware;
        $this->globalMiddleware = array_merge($this->globalMiddleware, $middleware);
        $callback($this);
        $this->globalMiddleware = $prev;
    }

    public function get($url, $fn, $mw = [])    { $this->addRoute('GET', $url, $fn, $mw); }
    public function post($url, $fn, $mw = [])   { $this->addRoute('POST', $url, $fn, $mw); }
    public function put($url, $fn, $mw = [])    { $this->addRoute('PUT', $url, $fn, $mw); }
    public function delete($url, $fn, $mw = []) { $this->addRoute('DELETE', $url, $fn, $mw); }
    public function patch($url, $fn, $mw = [])  { $this->addRoute('PATCH', $url, $fn, $mw); }
    public function options($url, $fn, $mw = []){ $this->addRoute('OPTIONS', $url, $fn, $mw); }

    private function addRoute($method, $url, $fn, $middleware)
    {
        $this->routes[$method][$url] = [
            'handler' => $fn,
            'middleware' => array_merge($this->globalMiddleware, $middleware)
        ];
    }

    public function comprobarRutas()
    {
        $currentUrl = $_SERVER['REQUEST_URI'] ?? '/';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        if (!isset($this->routes[$method])) {
            http_response_code(405);
            echo "Método no permitido";
            return;
        }

        $route = $this->findRoute($method, $currentUrl);

        if ($route) {
            $this->executeMiddleware($route['middleware'], $route['handler'], $route['params']);
        } else {
            http_response_code(404);
            echo "Página No Encontrada o Ruta no válida";
        }
    }

    private function findRoute($method, $currentUrl)
    {
        foreach ($this->routes[$method] as $route => $routeData) {
            $routePattern = preg_replace('/\{([a-zA-Z0-9_-]+)\}/', '([A-Za-z0-9_-]+)', $route);
            $routePattern = '/^' . str_replace('/', '\/', $routePattern) . '\/?$/';
            if (preg_match($routePattern, $currentUrl, $matches)) {
                array_shift($matches);
                return [
                    'handler' => $routeData['handler'],
                    'middleware' => $routeData['middleware'],
                    'params' => $matches,
                ];
            }
        }
        return null;
    }

    private function executeMiddleware(array $middleware, $handler, array $params)
    {
        $index = 0;
        $next = function() use (&$index, $middleware, $handler, &$next, $params) {
            if ($index < count($middleware)) {
                $fn = $middleware[$index++];
                if (is_callable($fn)) $fn($next, $this); else $fn($next);
            } else {
                call_user_func_array($handler, [$this, ...$params]);
            }
        };
        $next();
    }
}
