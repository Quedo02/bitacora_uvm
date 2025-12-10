<?php
namespace Model;

use Exception;

class ActiveRecord {
    protected static $primaryKey = 'id';
    protected static $db;
    protected static $sqlSrv;
    protected static $tabla = '';
    protected static $columnasDB = [];
    protected static $alertas = [];

    public static function setDB($database) { self::$db = $database; }
    public static function setSQLSrv($database) { self::$sqlSrv = $database; }

    public static function setAlerta($tipo, $mensaje) { static::$alertas[$tipo][] = $mensaje; }
    public static function getAlertas() { return static::$alertas; }
    public function validar() { static::$alertas = []; return static::$alertas; }

    protected static function hasEliminacion() {
        return in_array('eliminacion', static::$columnasDB, true);
    }

    public function guardar() {
        try {
            if (!is_null($this->{static::$primaryKey})) {
                return $this->actualizar();
            } else {
                return $this->crear();
            }
        } catch (\Exception $e) {
            return ['resultado' => false, 'error' => '¡Error! ' . $e->getMessage()];
        }
    }

    public static function all() {
        $query = "SELECT * FROM " . static::$tabla;
        if (static::hasEliminacion()) $query .= " WHERE eliminacion IS NULL";
        return self::consultarSQL($query);
    }

    public static function find($id) {
        $id = (int)$id;
        $query = "SELECT * FROM " . static::$tabla . " WHERE id = {$id} LIMIT 1";
        $res = self::consultarSQL($query);
        return array_shift($res);
    }

    public static function get($limite) {
        $limite = (int)$limite;
        $query = "SELECT * FROM " . static::$tabla;
        if (static::hasEliminacion()) $query .= " WHERE eliminacion IS NULL";
        $query .= " LIMIT {$limite}";
        $res = self::consultarSQL($query);
        return array_shift($res);
    }

    public static function where($columna, $valor) {
        $query = "SELECT * FROM " . static::$tabla . " WHERE {$columna} = :v";
        if (static::hasEliminacion()) $query .= " AND eliminacion IS NULL";
        $query .= " LIMIT 1";
        $stmt = self::$db->prepare($query);
        $stmt->execute(['v'=>$valor]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? static::crearObjeto($row) : null;
    }

    public static function whereMany($columna, $valor, $extra = '') {
        $query = "SELECT * FROM " . static::$tabla . " WHERE {$columna} = :v";
        if (static::hasEliminacion()) $query .= " AND eliminacion IS NULL";
        if ($extra) $query .= " " . $extra;

        $stmt = self::$db->prepare($query);
        $stmt->execute(['v' => $valor]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        return array_map(fn($r) => static::crearObjeto($r), $rows);
    }

    public static function whereCompare($columna, $operador, $valor, $extra = '') {
        $allowedOps = ['>', '<', '>=', '<='];
        if (!in_array($operador, $allowedOps, true)) {
            throw new Exception("Operador no permitido: {$operador}");
        }

        if (!in_array($columna, static::$columnasDB, true)) {
            throw new Exception("Columna no permitida: {$columna}");
        }

        $query = "SELECT * FROM " . static::$tabla . " WHERE {$columna} {$operador} :v";
        if (static::hasEliminacion()) $query .= " AND eliminacion IS NULL";
        if ($extra) $query .= " " . $extra;

        $stmt = self::$db->prepare($query);
        $stmt->execute(['v' => $valor]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(fn($r) => static::crearObjeto($r), $rows);
    }

    public static function whereValueBetween($colInicio, $colFin, $valor, $extra = '', $single = true) {
        if (!in_array($colInicio, static::$columnasDB, true)) {
            throw new Exception("Columna no permitida: {$colInicio}");
        }
        if (!in_array($colFin, static::$columnasDB, true)) {
            throw new Exception("Columna no permitida: {$colFin}");
        }

        $query = "SELECT * FROM " . static::$tabla . " 
                WHERE {$colInicio} <= :v1
                    AND {$colFin} >= :v2";

        if (static::hasEliminacion()) $query .= " AND eliminacion IS NULL";
        if ($extra) $query .= " " . $extra;

        if ($single) $query .= " LIMIT 1";

        $stmt = self::$db->prepare($query);
        $stmt->execute([
            'v1' => $valor,
            'v2' => $valor
        ]);

        if ($single) {
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $row ? static::crearObjeto($row) : null;
        }

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        return array_map(fn($r) => static::crearObjeto($r), $rows);
    }



    public static function SQL($consulta) {
        return self::consultarSQL($consulta);
    }

    public function crear() {
        $atributos = $this->sanitizarAtributos();
        $atributos = array_filter($atributos, fn($v) => $v !== null);

        if (empty($atributos)) {
            throw new \Exception('No hay atributos para insertar.');
        }

        $columnas = array_keys($atributos);
        $placeholders = array_fill(0, count($columnas), '?');

        $sql = "INSERT INTO " . static::$tabla .
            " (" . implode(', ', $columnas) . ")
                VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = self::$db->prepare($sql);
        $ok = $stmt->execute(array_values($atributos));

        if ($ok) {
            $lastId = self::$db->lastInsertId();
            $this->{static::$primaryKey} = is_numeric($lastId) ? (int)$lastId : $lastId;
        }

        return ['resultado' => $ok, 'id' => $this->{static::$primaryKey}];
    }

    public function actualizar() {
        // SET dinámico, asignando NULL explícito sólo si el valor es null
        $atributos = $this->sanitizarAtributos(); // ya excluye PK
        $sets = [];
        $params = [];

        foreach ($atributos as $key => $value) {
            if ($value === null) {
                $sets[] = "{$key} = NULL";
            } else {
                $sets[] = "{$key} = :{$key}";
                $params[$key] = $value;
            }
        }

        if (empty($sets)) return true; // nada que actualizar

        $sql = "UPDATE " . static::$tabla .
               " SET " . implode(', ', $sets) .
               " WHERE " . static::$primaryKey . " = :__id LIMIT 1";

        $params['__id'] = $this->{static::$primaryKey};
        $stmt = self::$db->prepare($sql);
        return $stmt->execute($params);
    }

    // Soft delete siempre
    public function eliminar(){
        $sql = "UPDATE " . static::$tabla . " SET eliminacion = NOW() WHERE id = :id LIMIT 1";
        $stmt = self::$db->prepare($sql);
        return $stmt->execute(['id' => $this->id]);
    }

    public static function consultarSQL($query) {
        $resultado = self::$db->query($query);
        $array = [];
        while($registro = $resultado->fetch(\PDO::FETCH_ASSOC)) {
            $array[] = static::crearObjeto($registro);
        }
        return $array;
    }

    protected static function crearObjeto($registro) {
        $obj = new \stdClass;
        foreach($registro as $key => $value) {
            $obj->$key = $value;
        }
        return $obj;
    }

    public function atributos() {
        $atributos = [];
        foreach(static::$columnasDB as $columna) {
            if ($columna === static::$primaryKey) continue; // nunca enviar PK en SET
            // sólo asigna si la propiedad existe
            if (property_exists($this, $columna)) {
                $atributos[$columna] = $this->$columna;
            }
        }
        return $atributos;
    }

    public function sanitizarAtributos() {
        // Aquí podrías sanear/trim si lo necesitas
        return $this->atributos();
    }

    public function sincronizar($args=[]) {
        foreach($args as $key => $value) {
            if(property_exists($this, $key)) {
                $this->$key = $value;
            }
        }
    }
}
