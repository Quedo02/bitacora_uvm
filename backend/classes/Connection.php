<?php
namespace Classes;

class Connection {
	private $servername;
	private $username;
	private $password;
	private $dbname;

	public function __construct() {
		$this->username   = $_ENV['usuario'];
		$this->password   = $_ENV['password'];
		$this->dbname     = $_ENV['database'];
		$this->servername = $_ENV['host'];
	}

	public function startConn(){
		try {
		$dsn = "mysql:host={$this->servername};dbname={$this->dbname};charset=utf8mb4";
		$connection = new \PDO($dsn, $this->username, $this->password, [
			\PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
			\PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
			\PDO::ATTR_EMULATE_PREPARES   => false,
		]);
		return $connection;
		} catch (\PDOException $e) {
		print "¡Error! en {$this->dbname}: " . $e->getMessage() . "<br/>";
		die();
		}
	}
}
