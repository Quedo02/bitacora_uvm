<?php
namespace Controllers;

use MVC\Router;

class ApiController {
        private static function normalizeForJson(array $row): array {
        foreach ($row as $k => $v) {
            if (is_string($v)) {
                // si no es UTF-8, asumimos binario (e.g., BINARY(16))
                if (!mb_check_encoding($v, 'UTF-8')) {
                    // conviértelo a hex legible; opcional: formatear a UUID
                    $row[$k] = bin2hex($v);
                }
            }
        }
        return $row;
    }

    public static function get(Router $router, $modelo){
        $modelo = "Model\\" . ucfirst($modelo);
        try {
            $objects = $modelo::all();
            $payload = array_map(fn($o) => self::normalizeForJson((array)$o), $objects);
            echo json_encode(['code'=>200,'response'=>$payload], JSON_UNESCAPED_UNICODE); exit;
        } catch(\Exception $e){
            http_response_code(400);
            echo json_encode(['code'=>400,'response'=>$e->getMessage()]); exit;
        }
    }

    public static function create(Router $router, $modelo){
        $modelo = "Model\\" . ucfirst($modelo);
        if(($_SERVER['REQUEST_METHOD'] ?? '')!=='POST'){ http_response_code(405); exit; }

        $object = new $modelo();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $object->sincronizar($data);

        if (property_exists($object, 'password') && isset($data['password_hash'])) {
            $object->password = $data['password_hash'];
        }

        $resultado = $object->guardar();

        if($resultado['resultado']){
            $row = $modelo::find((int)$resultado['id']);
            echo json_encode(['code'=>201,'response'=>self::normalizeForJson((array)$row)], JSON_UNESCAPED_UNICODE); 
            exit;
        }
        http_response_code(400);
        echo json_encode(['code'=>400,'response'=>$resultado['error'] ?? 'No se pudo crear']); 
        exit;
    }

    public static function update(Router $router, $modelo, $id){
        $modelo = "Model\\" . ucfirst($modelo);
        if(($_SERVER['REQUEST_METHOD'] ?? '')!=='PUT'){ http_response_code(405); exit; }

        $found = $modelo::find((int)$id);
        if(!$found){ http_response_code(404); echo json_encode(['code'=>404,'response'=>'No encontrado']); exit; }

        $object = new $modelo((array)$found);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $object->sincronizar($data);

        if (property_exists($object, 'password') && isset($data['password_hash'])) {
            $object->password = $data['password_hash'];
        }

        $ok = $object->guardar();
        echo json_encode($ok ? ['code'=>200] : ['code'=>400,'response'=>'No se pudo actualizar']); exit;
    }

    public static function delete(Router $router, $modelo, $id){
        $modelo = "Model\\" . ucfirst($modelo);
        if(($_SERVER['REQUEST_METHOD'] ?? '')!=='DELETE'){ http_response_code(405); exit; }

        $row = $modelo::find((int)$id);
        if(!$row){ http_response_code(404); echo json_encode(['code'=>404,'response'=>'No encontrado']); exit; }

        $object = new $modelo((array)$row);
        $ok = $object->eliminar();
        echo json_encode($ok ? ['code'=>200] : ['code'=>400,'response'=>'No se pudo eliminar']); exit;
    }
}
