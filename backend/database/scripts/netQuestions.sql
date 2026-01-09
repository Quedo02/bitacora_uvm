/* ============================================================================
  Seed de preguntas DUMMIE (ISC / materias “importantes”)
  - Inserta 15 preguntas por materia (excepto RED3, agrega 8 para completar 15,
    porque ya tienes 7 creadas en materia_id=36).
  - Todas quedan en estado: aprobada
  - Crea: pregunta + pregunta_version (v1) + pregunta_version_area (+ voto opcional)
  - Evita duplicados por (materia_id + enunciado)

  Ajusta si quieres:
    @AREA_ID, @CREATOR_ID, @ADD_VOTE, @VOTER_ID

  Requisitos:
    - MariaDB con funciones JSON_OBJECT / JSON_ARRAY (MariaDB 10.2+)
============================================================================ */

START TRANSACTION;

SET @AREA_ID     := 1;  -- Ingeniería
SET @CREATOR_ID  := 2;  -- tu coordinador (según tu data)
SET @ADD_VOTE    := 1;  -- 1 = inserta voto "aprobar" para simular aprobada
SET @VOTER_ID    := 2;  -- quien vota (usa un usuario que exista)

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_seed_question $$
CREATE PROCEDURE sp_seed_question(
  IN p_materia_id INT,
  IN p_tipo VARCHAR(32),
  IN p_enunciado TEXT,
  IN p_dificultad INT,
  IN p_parcial_id INT,
  IN p_contenido LONGTEXT,
  IN p_respuesta LONGTEXT
)
sp:BEGIN
  DECLARE v_dup INT DEFAULT 0;
  DECLARE v_pregunta_id INT;
  DECLARE v_version_id INT;

  -- Evitar duplicados si corres el script varias veces
  SELECT COUNT(*)
    INTO v_dup
  FROM pregunta p
  JOIN pregunta_version pv ON pv.pregunta_id = p.id
  WHERE p.materia_id = p_materia_id
    AND pv.enunciado = p_enunciado;

  IF v_dup > 0 THEN
    LEAVE sp;
  END IF;

  INSERT INTO pregunta(materia_id, creada_por_usuario_id, estado, version_actual_id, created_at, updated_at)
  VALUES (p_materia_id, @CREATOR_ID, 'aprobada', NULL, NOW(), NOW());
  SET v_pregunta_id = LAST_INSERT_ID();

  INSERT INTO pregunta_version(
    pregunta_id, version_num, tipo, enunciado, dificultad, scope, parcial_id,
    contenido_json, respuesta_json, estado, created_by, created_at, updated_at
  )
  VALUES (
    v_pregunta_id, 1, p_tipo, p_enunciado, p_dificultad, 'parcial', p_parcial_id,
    p_contenido, p_respuesta, 'aprobada', @CREATOR_ID, NOW(), NOW()
  );
  SET v_version_id = LAST_INSERT_ID();

  UPDATE pregunta
     SET version_actual_id = v_version_id,
         updated_at = NOW()
   WHERE id = v_pregunta_id;

  INSERT INTO pregunta_version_area(pregunta_version_id, area_id)
  VALUES (v_version_id, @AREA_ID);

  IF @ADD_VOTE = 1 THEN
    INSERT INTO pregunta_voto(pregunta_version_id, area_id, votante_id, decision, comentario, created_at, updated_at)
    VALUES (v_version_id, @AREA_ID, @VOTER_ID, 'aprobar', NULL, NOW(), NOW());
  END IF;
END $$

DELIMITER ;



/* ============================================================================
  5) Arquitectura de computadoras (ARCO)  -> materia_id = 5
============================================================================ */
CALL sp_seed_question(5,'opcion_multiple',
  '¿Qué componente ejecuta instrucciones y coordina la operación del sistema?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('CPU','RAM','GPU','SSD'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(5,'verdadero_falso',
  'La memoria caché suele ser más rápida que la memoria RAM.',
  3,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(5,'opcion_multiple',
  'En una arquitectura Harvard, ¿qué se separa físicamente?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Memoria de instrucciones y memoria de datos','RAM y ROM','CPU y GPU','Disco y red'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(5,'completar',
  'La unidad que realiza operaciones aritméticas y lógicas se llama ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','ALU')))
);

CALL sp_seed_question(5,'opcion_multiple',
  '¿Para qué sirve la MMU (Memory Management Unit)?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Traduce direcciones virtuales a físicas y aplica protección','Aumenta la frecuencia del CPU','Convierte AC a DC','Cifra paquetes de red'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(5,'relacionar',
  'Relaciona el componente con su descripción.',
  5,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','Registro'),
      JSON_OBJECT('id','L2','texto','Caché'),
      JSON_OBJECT('id','L3','texto','RAM'),
      JSON_OBJECT('id','L4','texto','SSD')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Muy rápida, muy pequeña (cerca del CPU)'),
      JSON_OBJECT('id','R2','texto','Rápida, almacena bloques usados frecuentemente'),
      JSON_OBJECT('id','R3','texto','Volátil, memoria principal de trabajo'),
      JSON_OBJECT('id','R4','texto','No volátil, almacenamiento secundario')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(5,'ordenar',
  'Ordena las etapas clásicas de un pipeline de 5 fases.',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('Fetch','Decode','Execute','Memory','Writeback')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);

CALL sp_seed_question(5,'numerica',
  'Si el bus de direcciones es de 32 bits y se direcciona por byte, ¿cuánta memoria máxima se puede direccionar en GB?',
  6,1,
  JSON_OBJECT('unidad','GB'),
  JSON_OBJECT('valor',4,'tolerancia',0)
);

CALL sp_seed_question(5,'opcion_multiple',
  '¿Qué significa “little-endian”?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'El byte menos significativo se guarda en la dirección más baja',
    'El byte más significativo se guarda en la dirección más baja',
    'Los bits se guardan al revés físicamente',
    'Solo aplica a IPv6'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(5,'verdadero_falso',
  'Una interrupción permite atender eventos asíncronos sin estar haciendo polling constante.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(5,'opcion_multiple',
  '¿Cuál de estas memorias es volátil?',
  3,1,
  JSON_OBJECT('opciones', JSON_ARRAY('RAM','SSD','HDD','DVD'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(5,'completar',
  'El “cuello de botella de ?” describe la limitación de rendimiento por el bus/memoria en la arquitectura clásica.',
  6,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','Von Neumann')))
);

CALL sp_seed_question(5,'opcion_multiple',
  '¿Qué técnica busca reducir fallos de caché trayendo datos antes de que se pidan explícitamente?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Prefetching','Paging','Swapping','ARP'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(5,'ordenar',
  'Ordena de más cercano a más lejano al CPU.',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('Registros','Caché L1','RAM','SSD')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(5,'abierta',
  'Explica la diferencia entre una interrupción por hardware y una por software.',
  6,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('hardware','software','excepcion','syscall')),
  JSON_OBJECT('keywords', JSON_ARRAY('hardware','software','excepcion','syscall'), 'min_hits', 3)
);



/* ============================================================================
  8) Lógica y programación estructurada (LOES) -> materia_id = 8
============================================================================ */
CALL sp_seed_question(8,'opcion_multiple',
  '¿Cuál NO es una estructura básica de la programación estructurada?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Secuencia','Selección','Iteración','goto'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(3))
);

CALL sp_seed_question(8,'verdadero_falso',
  'Un ciclo while puede ejecutarse 0 veces.',
  2,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(8,'completar',
  'En C/Java, el operador para “y lógico” es ?.',
  3,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','&&')))
);

CALL sp_seed_question(8,'opcion_multiple',
  '¿Qué describe Big-O?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Cota del crecimiento del tiempo/espacio','El número de líneas de código','El tamaño del compilador','La velocidad del CPU'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(8,'numerica',
  '¿Cuánto vale 7 % 3?',
  2,1,
  JSON_OBJECT('unidad','entero'),
  JSON_OBJECT('valor',1,'tolerancia',0)
);

CALL sp_seed_question(8,'relacionar',
  'Relaciona el operador con su significado.',
  3,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','=='),
      JSON_OBJECT('id','L2','texto','!='),
      JSON_OBJECT('id','L3','texto','&&'),
      JSON_OBJECT('id','L4','texto','||')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Igual'),
      JSON_OBJECT('id','R2','texto','Diferente'),
      JSON_OBJECT('id','R3','texto','Y lógico'),
      JSON_OBJECT('id','R4','texto','O lógico')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(8,'ordenar',
  'Ordena un flujo básico de depuración.',
  4,1,
  JSON_OBJECT('items', JSON_ARRAY('Reproducir el bug','Aislar la causa','Corregir','Probar','Documentar')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);

CALL sp_seed_question(8,'opcion_multiple',
  '¿Qué estructura conviene para elegir entre muchos casos por igualdad de una variable?',
  3,1,
  JSON_OBJECT('opciones', JSON_ARRAY('switch','for','do-while','try-catch'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(8,'verdadero_falso',
  'La recursión siempre es más eficiente que un ciclo.',
  3,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);

CALL sp_seed_question(8,'completar',
  'La palabra clave que rompe un ciclo inmediatamente es ?.',
  3,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','break')))
);

CALL sp_seed_question(8,'opcion_multiple',
  '¿Cuál es el costo de búsqueda lineal en un arreglo de n elementos?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('O(n)','O(log n)','O(1)','O(n log n)'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(8,'ordenar',
  'Ordena los pasos para diseñar un algoritmo.',
  4,1,
  JSON_OBJECT('items', JSON_ARRAY('Entender el problema','Definir entradas/salidas','Diseñar pasos','Probar con casos','Implementar')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);

CALL sp_seed_question(8,'abierta',
  'Describe un algoritmo para encontrar el máximo en un arreglo.',
  4,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('recorrer','max','comparar','inicializar')),
  JSON_OBJECT('keywords', JSON_ARRAY('recorrer','max','comparar','inicializar'), 'min_hits', 3)
);

CALL sp_seed_question(8,'opcion_multiple',
  'En un diagrama de flujo, el símbolo de decisión suele ser un:',
  2,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Rombo','Rectángulo','Círculo','Flecha'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(8,'verdadero_falso',
  'En C y Java, los arreglos usan indexación base 0.',
  2,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);



/* ============================================================================
  15) Programación orientada a objetos (PREN) -> materia_id = 15
============================================================================ */
CALL sp_seed_question(15,'opcion_multiple',
  '¿Qué describe mejor la encapsulación en POO?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Ocultar el estado interno y exponer una interfaz','Copiar objetos por referencia','Evitar el uso de clases','Convertir datos a JSON'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(15,'verdadero_falso',
  'La herencia modela una relación “es-un” (is-a).',
  3,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(15,'completar',
  'En Java, la palabra clave para instanciar un objeto es ?.',
  2,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','new')))
);

CALL sp_seed_question(15,'opcion_multiple',
  '¿Cuál es un ejemplo típico de polimorfismo?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Usar una referencia de tipo base para apuntar a un objeto de una subclase',
    'Tener variables globales',
    'Usar solo funciones estáticas',
    'Evitar interfaces'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(15,'relacionar',
  'Relaciona el modificador de acceso con su alcance típico (Java).',
  4,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','public'),
      JSON_OBJECT('id','L2','texto','private'),
      JSON_OBJECT('id','L3','texto','protected'),
      JSON_OBJECT('id','L4','texto','(default)')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Accesible desde cualquier clase'),
      JSON_OBJECT('id','R2','texto','Solo dentro de la misma clase'),
      JSON_OBJECT('id','R3','texto','Mismo paquete y subclases'),
      JSON_OBJECT('id','R4','texto','Solo mismo paquete')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(15,'ordenar',
  'Ordena el flujo típico de construcción en herencia (Java).',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('Constructor de la superclase','Inicialización/constructores de la subclase','Constructor de la subclase termina')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2))
);

CALL sp_seed_question(15,'opcion_multiple',
  '¿Qué describe mejor una interfaz (en general)?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Define un contrato de métodos','Guarda datos en disco','Reemplaza al compilador','Es lo mismo que un objeto'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(15,'verdadero_falso',
  'En Java, solo cambiar el tipo de retorno NO es suficiente para sobrecargar un método.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(15,'completar',
  'El principio SOLID que dice “una clase debe tener una sola razón para cambiar” es ?.',
  6,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','SRP')))
);

CALL sp_seed_question(15,'opcion_multiple',
  'La composición en POO se asocia con una relación:',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('tiene-un (has-a)','es-un (is-a)','depende-de (uses-a) siempre','comparte-un (share-a)'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(15,'numerica',
  'Una interfaz funcional (Java) tiene exactamente ¿cuántos métodos abstractos?',
  4,1,
  JSON_OBJECT('unidad','cantidad'),
  JSON_OBJECT('valor',1,'tolerancia',0)
);

CALL sp_seed_question(15,'abierta',
  'Explica la diferencia entre == y equals() en Java.',
  5,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('referencia','contenido','override','Object')),
  JSON_OBJECT('keywords', JSON_ARRAY('referencia','contenido','override','Object'), 'min_hits', 3)
);

CALL sp_seed_question(15,'opcion_multiple',
  '¿Qué implica declarar un atributo como static en Java?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Pertenece a la clase, no a una instancia','Solo vive en el stack','Se guarda en disco','Se vuelve inmutable'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(15,'verdadero_falso',
  'Un método final en Java puede ser sobrescrito por una subclase.',
  3,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);

CALL sp_seed_question(15,'ordenar',
  'Ordena el ciclo típico de vida de un objeto (referencias + GC).',
  4,1,
  JSON_OBJECT('items', JSON_ARRAY('Crear referencia','Usar el objeto','Perder referencias','Recolección de basura')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);



/* ============================================================================
  19) Sistemas operativos (SIOP) -> materia_id = 19
============================================================================ */
CALL sp_seed_question(19,'opcion_multiple',
  '¿Cuál es la diferencia más común entre proceso y hilo?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Un proceso tiene su propio espacio de direcciones; los hilos comparten memoria del proceso',
    'Un hilo siempre es más pesado que un proceso',
    'Un proceso no puede crear hilos',
    'Son exactamente lo mismo'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(19,'verdadero_falso',
  'Un cambio de contexto (context switch) tiene sobrecosto.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(19,'completar',
  'En Unix/Linux, la llamada clásica para crear un proceso es ?().',
  6,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','fork')))
);

CALL sp_seed_question(19,'opcion_multiple',
  'Round Robin (RR) se caracteriza por usar:',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Quantum de tiempo','Prioridad fija sin turnos','Solo trabajos cortos','Paginación por demanda'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(19,'relacionar',
  'Relaciona el algoritmo de planificación con su descripción.',
  5,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','FCFS'),
      JSON_OBJECT('id','L2','texto','SJF'),
      JSON_OBJECT('id','L3','texto','Round Robin'),
      JSON_OBJECT('id','L4','texto','Prioridades')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Atiende en orden de llegada'),
      JSON_OBJECT('id','R2','texto','Prefiere el trabajo más corto'),
      JSON_OBJECT('id','R3','texto','Turnos con quantum'),
      JSON_OBJECT('id','R4','texto','Ordena por prioridad')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(19,'ordenar',
  'Ordena estados típicos de un proceso.',
  4,1,
  JSON_OBJECT('items', JSON_ARRAY('New','Ready','Running','Waiting','Terminated')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);

CALL sp_seed_question(19,'numerica',
  'Si el offset de página es de 12 bits, ¿de qué tamaño es la página en bytes?',
  6,1,
  JSON_OBJECT('unidad','bytes'),
  JSON_OBJECT('valor',4096,'tolerancia',0)
);

CALL sp_seed_question(19,'opcion_multiple',
  '¿Qué es un deadlock?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Bloqueo circular donde procesos/hilos esperan recursos entre sí',
    'Un proceso que consume mucha CPU',
    'Una falla de red',
    'Una actualización del sistema'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(19,'verdadero_falso',
  'La paginación elimina la fragmentación externa, pero puede generar fragmentación interna.',
  6,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(19,'completar',
  'El algoritmo de reemplazo de página más simple se conoce como ? (First-In, First-Out).',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','FIFO')))
);

CALL sp_seed_question(19,'opcion_multiple',
  '¿Qué mecanismo aísla procesos usando direcciones virtuales?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Memoria virtual + MMU','ARP','DNS','QoS'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(19,'ordenar',
  'Ordena el flujo típico de atención a una interrupción.',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('Guardar contexto','Saltar a rutina de servicio (ISR)','Atender el evento','Restaurar contexto')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(19,'abierta',
  'Explica la diferencia entre memoria virtual y memoria física.',
  5,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('virtual','fisica','paginacion','MMU','swap')),
  JSON_OBJECT('keywords', JSON_ARRAY('virtual','fisica','paginacion','MMU','swap'), 'min_hits', 3)
);

CALL sp_seed_question(19,'opcion_multiple',
  '¿Cuál sistema de archivos es común en Linux y usa journaling?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('ext4','FAT32','exFAT','HFS+'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(19,'numerica',
  'Si un disco tiene sectores de 512 bytes, ¿cuántos bytes son 8 sectores?',
  3,1,
  JSON_OBJECT('unidad','bytes'),
  JSON_OBJECT('valor',4096,'tolerancia',0)
);



/* ============================================================================
  22) Bases de datos relacionales (BDRE) -> materia_id = 22
============================================================================ */
CALL sp_seed_question(22,'opcion_multiple',
  '¿Cuál es el propósito principal de una clave primaria (PK)?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Identificar filas de forma única','Mejorar solo INSERT','Encriptar datos','Crear usuarios'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(22,'verdadero_falso',
  'Una clave foránea (FK) ayuda a mantener la integridad referencial.',
  3,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(22,'completar',
  'La cláusula SQL para filtrar filas es ?.',
  2,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','WHERE')))
);

CALL sp_seed_question(22,'opcion_multiple',
  '¿Qué JOIN trae todos los registros de la tabla izquierda y solo coincidencias de la derecha?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('LEFT JOIN','INNER JOIN','RIGHT JOIN','CROSS JOIN'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(22,'relacionar',
  'Relaciona la cláusula SQL con su función.',
  4,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','SELECT'),
      JSON_OBJECT('id','L2','texto','FROM'),
      JSON_OBJECT('id','L3','texto','WHERE'),
      JSON_OBJECT('id','L4','texto','GROUP BY'),
      JSON_OBJECT('id','L5','texto','HAVING')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Selecciona columnas/expresiones'),
      JSON_OBJECT('id','R2','texto','Define tablas origen'),
      JSON_OBJECT('id','R3','texto','Filtra filas antes de agrupar'),
      JSON_OBJECT('id','R4','texto','Agrupa filas'),
      JSON_OBJECT('id','R5','texto','Filtra grupos')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4'),
      JSON_OBJECT('izq_id','L5','der_id','R5')
    )
  )
);

CALL sp_seed_question(22,'ordenar',
  'Ordena el orden lógico de cláusulas en una consulta SQL.',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('SELECT','FROM','WHERE','GROUP BY','HAVING','ORDER BY','LIMIT')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4,5,6))
);

CALL sp_seed_question(22,'numerica',
  'Aproxima log2(1,000,000). (Útil para entender búsquedas tipo árbol/B-Tree).',
  5,1,
  JSON_OBJECT('unidad','aprox'),
  JSON_OBJECT('valor',20,'tolerancia',2)
);

CALL sp_seed_question(22,'opcion_multiple',
  'En ACID, la “I” significa:',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Isolation','Integrity','Index','Iteration'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(22,'verdadero_falso',
  'Un índice siempre mejora el rendimiento de INSERT/UPDATE.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);

CALL sp_seed_question(22,'completar',
  'La normalización busca reducir la ? de datos.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','redundancia')))
);

CALL sp_seed_question(22,'opcion_multiple',
  '¿Qué nivel de aislamiento evita lecturas sucias (dirty reads)?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY('READ COMMITTED','READ UNCOMMITTED','SERIALIZABLE','NONE'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(22,'abierta',
  'Explica qué es la Tercera Forma Normal (3FN) y por qué ayuda.',
  6,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('dependencia','transitiva','clave','redundancia')),
  JSON_OBJECT('keywords', JSON_ARRAY('dependencia','transitiva','clave','redundancia'), 'min_hits', 3)
);

CALL sp_seed_question(22,'opcion_multiple',
  '¿Cuál función se usa para contar filas?',
  3,1,
  JSON_OBJECT('opciones', JSON_ARRAY('COUNT','SUM','AVG','MIN'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(22,'numerica',
  'Si n=1024, ¿cuánto vale log2(n)?',
  3,1,
  JSON_OBJECT('unidad','aprox'),
  JSON_OBJECT('valor',10,'tolerancia',0)
);

CALL sp_seed_question(22,'ordenar',
  'Ordena pasos para diseñar una BD relacional.',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('Requisitos','Identificar entidades','Definir relaciones','Normalizar','Definir índices/constraints')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);



/* ============================================================================
  23) Programación concurrente (PCON) -> materia_id = 23
============================================================================ */
CALL sp_seed_question(23,'opcion_multiple',
  '¿Qué es una condición de carrera (race condition)?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Resultado depende del interleaving no controlado entre hilos',
    'Un hilo que siempre gana CPU',
    'Un deadlock garantizado',
    'Una optimización del compilador'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(23,'verdadero_falso',
  'Un mutex garantiza exclusión mutua.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(23,'completar',
  'Una región de código que no debe ejecutarse simultáneamente por varios hilos se llama sección ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','crítica')))
);

CALL sp_seed_question(23,'opcion_multiple',
  '¿Para qué sirve un semáforo contador?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Controlar acceso a un número limitado de recursos',
    'Reemplazar a la CPU',
    'Resolver DNS',
    'Cifrar tráfico'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(23,'relacionar',
  'Relaciona el mecanismo con su uso típico.',
  5,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','Mutex'),
      JSON_OBJECT('id','L2','texto','Semáforo'),
      JSON_OBJECT('id','L3','texto','Monitor'),
      JSON_OBJECT('id','L4','texto','Operación atómica')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Exclusión mutua de un recurso'),
      JSON_OBJECT('id','R2','texto','Permite N accesos concurrentes'),
      JSON_OBJECT('id','R3','texto','Sincronización con locks + condición'),
      JSON_OBJECT('id','R4','texto','Actualización indivisible a nivel de CPU')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(23,'ordenar',
  'Ordena un patrón típico con condición (wait/notify).',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('Adquirir lock','Verificar condición','wait (libera lock y espera)','Ser notificado','Re-adquirir lock y continuar','Liberar lock')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4,5))
);

CALL sp_seed_question(23,'numerica',
  'Un semáforo binario inicializado en 1 permite como máximo ¿cuántos hilos en la sección crítica?',
  3,1,
  JSON_OBJECT('unidad','hilos'),
  JSON_OBJECT('valor',1,'tolerancia',0)
);

CALL sp_seed_question(23,'verdadero_falso',
  'El deadlock requiere cumplir las 4 condiciones de Coffman.',
  6,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(23,'opcion_multiple',
  '¿Qué estrategia ayuda a prevenir deadlocks?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Ordenar globalmente la adquisición de locks',
    'Usar más variables globales',
    'Desactivar el scheduler',
    'Eliminar la memoria virtual'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(23,'completar',
  'En Java, el método para esperar en un monitor es ?().',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','wait')))
);

CALL sp_seed_question(23,'opcion_multiple',
  '¿Qué describe mejor “starvation”?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Un hilo nunca obtiene recursos/CPU por políticas de prioridad',
    'Un hilo entra en deadlock siempre',
    'Un hilo se vuelve daemon',
    'Un hilo pierde memoria por fuga'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(23,'ordenar',
  'Ordena estados básicos de un hilo.',
  4,1,
  JSON_OBJECT('items', JSON_ARRAY('New','Runnable/Ready','Running','Blocked/Waiting','Terminated')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);

CALL sp_seed_question(23,'abierta',
  'Explica la diferencia entre concurrencia y paralelismo.',
  5,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('interleaving','cpu','nucleos','tiempo')),
  JSON_OBJECT('keywords', JSON_ARRAY('interleaving','cpu','nucleos','tiempo'), 'min_hits', 3)
);

CALL sp_seed_question(23,'opcion_multiple',
  'En POSIX Threads, ¿qué función crea un hilo?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('pthread_create','thread_start','fork','execve'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(23,'verdadero_falso',
  'Las operaciones atómicas eliminan la necesidad de sincronización en todos los casos.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);



/* ============================================================================
  24) Matemáticas discretas (MADI) -> materia_id = 24
============================================================================ */
CALL sp_seed_question(24,'opcion_multiple',
  'La implicación p → q es lógicamente equivalente a:',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY('¬p ∨ q','p ∧ q','¬p ∧ ¬q','p ∨ q'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(24,'verdadero_falso',
  'En un grafo simple no se permiten lazos (loops).',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(24,'completar',
  'El complemento de A (respecto al universo U) suele escribirse como ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','A^c')))
);

CALL sp_seed_question(24,'relacionar',
  'Relaciona el operador lógico con su significado.',
  4,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','∧'),
      JSON_OBJECT('id','L2','texto','∨'),
      JSON_OBJECT('id','L3','texto','¬'),
      JSON_OBJECT('id','L4','texto','→')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Y'),
      JSON_OBJECT('id','R2','texto','O'),
      JSON_OBJECT('id','R3','texto','Negación'),
      JSON_OBJECT('id','R4','texto','Implicación')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(24,'ordenar',
  'Ordena los pasos de una prueba por inducción.',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('Caso base','Hipótesis de inducción','Paso inductivo','Conclusión')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(24,'numerica',
  '¿Cuánto vale C(5,2)?',
  4,1,
  JSON_OBJECT('unidad','combinaciones'),
  JSON_OBJECT('valor',10,'tolerancia',0)
);

CALL sp_seed_question(24,'opcion_multiple',
  '¿Qué es un grafo bipartito?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Un grafo cuyos vértices se pueden dividir en 2 conjuntos sin aristas dentro del mismo conjunto',
    'Un grafo con 2 aristas por vértice',
    'Un grafo con pesos negativos',
    'Un grafo completo'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(24,'verdadero_falso',
  'Un conjunto con n elementos tiene 2^n subconjuntos.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(24,'numerica',
  'Si n=8, ¿cuántos subconjuntos tiene un conjunto con 8 elementos?',
  4,1,
  JSON_OBJECT('unidad','subconjuntos'),
  JSON_OBJECT('valor',256,'tolerancia',0)
);

CALL sp_seed_question(24,'opcion_multiple',
  'Una relación R es reflexiva si:',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Para todo a, (a,a) pertenece a R',
    'Para todo a, no existe (a,a) en R',
    'Si (a,b) entonces (b,a)',
    'Si (a,b) y (b,c) entonces (a,c)'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(24,'completar',
  'XOR (⊕) es verdadera cuando ?.',
  5,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','exactamente uno es verdadero')))
);

CALL sp_seed_question(24,'abierta',
  'Explica el principio del palomar (pigeonhole principle).',
  6,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('contenedores','elementos','inevitable','mas')),
  JSON_OBJECT('keywords', JSON_ARRAY('contenedores','elementos','inevitable','mas'), 'min_hits', 3)
);

CALL sp_seed_question(24,'ordenar',
  'Ordena por prioridad típica: complemento, intersección, unión.',
  4,1,
  JSON_OBJECT('items', JSON_ARRAY('Complemento','Intersección','Unión')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2))
);

CALL sp_seed_question(24,'opcion_multiple',
  'Una función f es inyectiva si:',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'f(a)=f(b) implica a=b',
    'Para todo y existe x tal que f(x)=y',
    'f(a)=a para todo a',
    'Tiene dominio infinito'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(24,'numerica',
  'En aritmética modular, 17 mod 5 =',
  3,1,
  JSON_OBJECT('unidad','entero'),
  JSON_OBJECT('valor',2,'tolerancia',0)
);



/* ============================================================================
  25) Redes I (RED1) -> materia_id = 25
============================================================================ */
CALL sp_seed_question(25,'opcion_multiple',
  '¿En qué capa del modelo OSI opera principalmente IP?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Capa de red','Capa de enlace','Capa de transporte','Capa de aplicación'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(25,'verdadero_falso',
  'TCP ofrece entrega confiable (retransmisión, orden, control de flujo).',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(25,'completar',
  'El protocolo que resuelve IP → MAC en una LAN se llama ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','ARP')))
);

CALL sp_seed_question(25,'opcion_multiple',
  '¿Qué puerto usa DNS por defecto?',
  3,1,
  JSON_OBJECT('opciones', JSON_ARRAY('53','80','443','25'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(25,'relacionar',
  'Relaciona protocolo con su puerto por defecto.',
  4,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','HTTP'),
      JSON_OBJECT('id','L2','texto','HTTPS'),
      JSON_OBJECT('id','L3','texto','SSH'),
      JSON_OBJECT('id','L4','texto','SMTP')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','80'),
      JSON_OBJECT('id','R2','texto','443'),
      JSON_OBJECT('id','R3','texto','22'),
      JSON_OBJECT('id','R4','texto','25')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(25,'ordenar',
  'Ordena el three-way handshake de TCP.',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('SYN','SYN-ACK','ACK')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2))
);

CALL sp_seed_question(25,'numerica',
  '¿Cuántas direcciones útiles tiene una subred /26 en IPv4?',
  6,1,
  JSON_OBJECT('unidad','hosts'),
  JSON_OBJECT('valor',62,'tolerancia',0)
);

CALL sp_seed_question(25,'opcion_multiple',
  '¿Qué dispositivo opera principalmente en capa 2 y reenvía por MAC?',
  3,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Switch','Router','Firewall de aplicación','Servidor DNS'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(25,'verdadero_falso',
  'NAT permite que varias IP privadas compartan una IP pública.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(25,'completar',
  'La máscara /24 en decimal es ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','255.255.255.0')))
);

CALL sp_seed_question(25,'opcion_multiple',
  '¿Qué protocolo asigna IP automáticamente a un host?',
  3,1,
  JSON_OBJECT('opciones', JSON_ARRAY('DHCP','DNS','ICMP','FTP'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(25,'ordenar',
  'Ordena las etapas de DHCP (DORA).',
  4,1,
  JSON_OBJECT('items', JSON_ARRAY('Discover','Offer','Request','Acknowledge')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(25,'abierta',
  'Explica la diferencia entre hub, switch y router.',
  5,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('capa','MAC','IP','broadcast','routing')),
  JSON_OBJECT('keywords', JSON_ARRAY('capa','MAC','IP','broadcast','routing'), 'min_hits', 3)
);

CALL sp_seed_question(25,'opcion_multiple',
  '¿Qué es una VLAN?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Segmentación lógica en capa 2',
    'Un tipo de cable',
    'Un protocolo de cifrado',
    'Un puerto de aplicación'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(25,'numerica',
  'En Ethernet, el tamaño mínimo de trama (sin preámbulo) es de:',
  5,1,
  JSON_OBJECT('unidad','bytes'),
  JSON_OBJECT('valor',64,'tolerancia',0)
);



/* ============================================================================
  30) Redes II (RED2) -> materia_id = 30
============================================================================ */
CALL sp_seed_question(30,'opcion_multiple',
  '¿Cuál es una diferencia clásica entre OSPF y RIP?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'OSPF es link-state; RIP es distance-vector',
    'OSPF usa UDP 53; RIP usa TCP 80',
    'RIP es más escalable que OSPF por diseño',
    'OSPF solo funciona con IPv6'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(30,'verdadero_falso',
  'OSPF usa el algoritmo SPF (Dijkstra) para calcular rutas.',
  6,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(30,'completar',
  'BGP usa el puerto TCP ? por defecto.',
  5,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','179')))
);

CALL sp_seed_question(30,'relacionar',
  'Relaciona protocolo de enrutamiento con su tipo.',
  6,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','OSPF'),
      JSON_OBJECT('id','L2','texto','RIP'),
      JSON_OBJECT('id','L3','texto','BGP'),
      JSON_OBJECT('id','L4','texto','EIGRP')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','IGP link-state'),
      JSON_OBJECT('id','R2','texto','IGP distance-vector'),
      JSON_OBJECT('id','R3','texto','EGP path-vector'),
      JSON_OBJECT('id','R4','texto','IGP (híbrido / avanzado)')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(30,'ordenar',
  'Ordena los estados clásicos del puerto en STP (802.1D).',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('Blocking','Listening','Learning','Forwarding')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(30,'opcion_multiple',
  '¿Qué es un trunk 802.1Q?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Un enlace que transporta tráfico de múltiples VLAN con etiquetas',
    'Un cable de fibra obligatorio',
    'Un protocolo para cifrar WiFi',
    'Una ruta por defecto'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(30,'numerica',
  'En una red /27, ¿cuántos bits quedan para hosts?',
  4,1,
  JSON_OBJECT('unidad','bits'),
  JSON_OBJECT('valor',5,'tolerancia',0)
);

CALL sp_seed_question(30,'verdadero_falso',
  'CIDR permite sumarización/agregación de rutas.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(30,'opcion_multiple',
  '¿Qué campo del encabezado IP se decrementa en cada salto?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('TTL','MTU','MSS','SSID'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(30,'completar',
  'En una ACL extendida, además de IP origen/destino, puedes filtrar por ?.',
  5,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','puerto')))
);

CALL sp_seed_question(30,'ordenar',
  'Ordena un flujo razonable para habilitar redundancia en switching.',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('Crear enlaces redundantes','Habilitar/validar STP','Probar failover','Monitorear')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(30,'abierta',
  'Explica NAT estático vs PAT (NAT overload).',
  6,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('estatico','PAT','puertos','multiples','traduccion')),
  JSON_OBJECT('keywords', JSON_ARRAY('estatico','PAT','puertos','multiples','traduccion'), 'min_hits', 3)
);

CALL sp_seed_question(30,'opcion_multiple',
  '¿Qué encapsulación se usa comúnmente para tunelar IP sobre IP?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY('GRE','ARP','ICMP','FTP'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(30,'verdadero_falso',
  'QoS puede priorizar tráfico sensible a latencia (voz/video) sobre tráfico best-effort.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(30,'numerica',
  'En una subred /30, ¿cuántas IP útiles hay?',
  5,1,
  JSON_OBJECT('unidad','hosts'),
  JSON_OBJECT('valor',2,'tolerancia',0)
);



/* ============================================================================
  36) Redes III (RED3) -> materia_id = 36
  Ya tienes 7 preguntas; aquí agregamos 8 para completar 15.
============================================================================ */
CALL sp_seed_question(36,'opcion_multiple',
  '¿Qué prefijo identifica direcciones IPv6 link-local?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY('fe80::/10','2001::/16','ff00::/8','::1/128'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(36,'verdadero_falso',
  'OSPF es un protocolo de enrutamiento de estado de enlace (link-state).',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(36,'completar',
  'El protocolo ? (Internet Key Exchange) se usa para negociar parámetros y llaves en IPsec.',
  6,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','IKE')))
);

CALL sp_seed_question(36,'relacionar',
  'Relaciona atributo BGP con su utilidad.',
  7,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','AS_PATH'),
      JSON_OBJECT('id','L2','texto','NEXT_HOP'),
      JSON_OBJECT('id','L3','texto','LOCAL_PREF'),
      JSON_OBJECT('id','L4','texto','MED')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Evita loops y muestra la ruta por AS'),
      JSON_OBJECT('id','R2','texto','Indica el siguiente salto hacia el prefijo'),
      JSON_OBJECT('id','R3','texto','Preferencia interna (mayor = mejor)'),
      JSON_OBJECT('id','R4','texto','Sugerencia de preferencia hacia vecinos (menor = mejor)')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(36,'ordenar',
  'Ordena los estados típicos de vecindad OSPF.',
  7,1,
  JSON_OBJECT('items', JSON_ARRAY('Down','Init','2-Way','ExStart','Exchange','Loading','Full')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4,5,6))
);

CALL sp_seed_question(36,'numerica',
  'En IPv6, un prefijo /64 deja ¿cuántos bits para el identificador de interfaz?',
  5,1,
  JSON_OBJECT('unidad','bits'),
  JSON_OBJECT('valor',64,'tolerancia',0)
);

CALL sp_seed_question(36,'abierta',
  'Explica qué es MPLS y por qué se usa en redes de proveedores.',
  7,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('labels','LSP','forwarding','VPN','carrier')),
  JSON_OBJECT('keywords', JSON_ARRAY('labels','LSP','forwarding','VPN','carrier'), 'min_hits', 3)
);

CALL sp_seed_question(36,'opcion_multiple',
  '¿Qué protocolo utiliza TCP puerto 179?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY('BGP','OSPF','RIP','EIGRP'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);



/* ============================================================================
  31) Fundamentos de la nube (FUNU) -> materia_id = 31
============================================================================ */
CALL sp_seed_question(31,'opcion_multiple',
  '¿Qué modelo ofrece máquinas virtuales y redes, pero tú administras el sistema operativo?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY('IaaS','PaaS','SaaS','On-prem'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(31,'verdadero_falso',
  'La elasticidad en la nube implica ajustar recursos automáticamente según demanda.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(31,'completar',
  'El esquema de cobro típico en la nube es pago por ? (pay-as-you-go).',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','uso')))
);

CALL sp_seed_question(31,'relacionar',
  'Relaciona el modelo con “quién administra qué”.',
  6,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','IaaS'),
      JSON_OBJECT('id','L2','texto','PaaS'),
      JSON_OBJECT('id','L3','texto','SaaS')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Tú administras OS y app; proveedor infra'),
      JSON_OBJECT('id','R2','texto','Tú administras app; proveedor runtime/OS/infra'),
      JSON_OBJECT('id','R3','texto','Proveedor administra casi todo; tú usas el software')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3')
    )
  )
);

CALL sp_seed_question(31,'ordenar',
  'Ordena un despliegue básico con contenedores.',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('Construir imagen','Subir a registry','Desplegar en entorno','Escalar réplicas','Monitorear')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);

CALL sp_seed_question(31,'opcion_multiple',
  '¿Qué es una “zona de disponibilidad” (AZ)?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Un datacenter/cluster aislado dentro de una región',
    'Un país completo',
    'Un protocolo de balanceo',
    'Un tipo de base de datos'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(31,'numerica',
  'Si pasas de 3 instancias a 6 instancias, el factor de escalamiento es:',
  3,1,
  JSON_OBJECT('unidad','factor'),
  JSON_OBJECT('valor',2,'tolerancia',0)
);

CALL sp_seed_question(31,'verdadero_falso',
  'En responsabilidad compartida, el proveedor siempre configura tus usuarios/roles por ti.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);

CALL sp_seed_question(31,'opcion_multiple',
  '¿Cuál es un ejemplo típico de “object storage”?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('S3 / almacenamiento de objetos','RAID 0','Swap','ARP cache'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(31,'completar',
  'El servicio que distribuye tráfico entre instancias se llama ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','load balancer')))
);

CALL sp_seed_question(31,'opcion_multiple',
  '“Alta disponibilidad” suele implicar:',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Redundancia y tolerancia a fallos','Mayor tamaño de disco','Menos monitoreo','Evitar balanceadores'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(31,'abierta',
  'Explica diferencia entre escalamiento vertical y horizontal.',
  5,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('vertical','horizontal','CPU','RAM','instancias')),
  JSON_OBJECT('keywords', JSON_ARRAY('vertical','horizontal','CPU','RAM','instancias'), 'min_hits', 3)
);

CALL sp_seed_question(31,'numerica',
  'Si RPO = 0, ¿cuántos minutos de pérdida de datos se aceptan?',
  4,1,
  JSON_OBJECT('unidad','minutos'),
  JSON_OBJECT('valor',0,'tolerancia',0)
);

CALL sp_seed_question(31,'opcion_multiple',
  '¿Qué describe mejor “serverless”?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Ejecutas funciones sin administrar servidores (infra abstraída)',
    'No existe backend',
    'Solo funciona offline',
    'Es lo mismo que una VM'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(31,'verdadero_falso',
  'Un contenedor incluye su propio kernel.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);



/* ============================================================================
  34) Tecnologías de construcción de servicios web (TECSW) -> materia_id = 34
============================================================================ */
CALL sp_seed_question(34,'opcion_multiple',
  '¿Qué método HTTP se usa típicamente para obtener un recurso sin modificarlo?',
  3,1,
  JSON_OBJECT('opciones', JSON_ARRAY('GET','POST','DELETE','PATCH'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(34,'verdadero_falso',
  'PUT es idempotente (en teoría): aplicar la misma petición repetida mantiene el mismo estado.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(34,'completar',
  'El header HTTP que indica el tipo de contenido es ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','Content-Type')))
);

CALL sp_seed_question(34,'relacionar',
  'Relaciona método HTTP con operación típica (CRUD).',
  4,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','GET'),
      JSON_OBJECT('id','L2','texto','POST'),
      JSON_OBJECT('id','L3','texto','PUT'),
      JSON_OBJECT('id','L4','texto','DELETE')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Leer'),
      JSON_OBJECT('id','R2','texto','Crear'),
      JSON_OBJECT('id','R3','texto','Reemplazar/Actualizar'),
      JSON_OBJECT('id','R4','texto','Eliminar')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(34,'ordenar',
  'Ordena una secuencia típica para abrir un sitio HTTPS.',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('DNS','TCP handshake','TLS handshake','HTTP request/response')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(34,'opcion_multiple',
  '¿Qué código HTTP representa “Created”?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('201','200','204','404'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(34,'numerica',
  '¿Qué código HTTP representa “Not Found”?',
  3,1,
  JSON_OBJECT('unidad','status'),
  JSON_OBJECT('valor',404,'tolerancia',0)
);

CALL sp_seed_question(34,'verdadero_falso',
  'CORS es una política de seguridad aplicada por el navegador.',
  4,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(34,'opcion_multiple',
  'Un JWT típicamente se compone de:',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY('header.payload.signature','user.password.hash','cookie.session.csrf','ip.port.proto'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(34,'completar',
  'El método HTTP para actualización parcial es ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','PATCH')))
);

CALL sp_seed_question(34,'opcion_multiple',
  'Autenticación vs autorización: la autorización define:',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Qué permisos tienes','Quién eres','Qué IP tienes','Qué navegador usas'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(34,'ordenar',
  'Ordena buenas prácticas al diseñar una API.',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('Definir recursos','Definir contratos (request/response)','Validación/errores','Documentar','Versionar')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);

CALL sp_seed_question(34,'abierta',
  'Explica paginación (limit/offset o cursor) y por qué es útil.',
  5,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('limit','offset','cursor','performance','orden')),
  JSON_OBJECT('keywords', JSON_ARRAY('limit','offset','cursor','performance','orden'), 'min_hits', 3)
);

CALL sp_seed_question(34,'relacionar',
  'Relaciona código HTTP con su significado.',
  4,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','200'),
      JSON_OBJECT('id','L2','texto','201'),
      JSON_OBJECT('id','L3','texto','401'),
      JSON_OBJECT('id','L4','texto','403')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','OK'),
      JSON_OBJECT('id','R2','texto','Created'),
      JSON_OBJECT('id','R3','texto','Unauthorized'),
      JSON_OBJECT('id','R4','texto','Forbidden')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(34,'verdadero_falso',
  'HTTPS cifra el contenido y además autentica al servidor (vía certificados TLS).',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);



/* ============================================================================
  41) Seguridad informática y análisis forense (SIAF) -> materia_id = 41
============================================================================ */
CALL sp_seed_question(41,'opcion_multiple',
  '¿Cuál es la diferencia principal entre hash y cifrado?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'El hash es unidireccional; el cifrado es reversible con una llave',
    'El hash requiere internet; el cifrado no',
    'El hash solo funciona con texto',
    'Son lo mismo'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(41,'verdadero_falso',
  'Un hash criptográfico es reversible si conoces la llave.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);

CALL sp_seed_question(41,'completar',
  'La tríada CIA significa Confidencialidad, Integridad y ?.',
  4,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','Disponibilidad')))
);

CALL sp_seed_question(41,'relacionar',
  'Relaciona algoritmo/técnica con su tipo.',
  5,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','SHA-256'),
      JSON_OBJECT('id','L2','texto','AES'),
      JSON_OBJECT('id','L3','texto','RSA'),
      JSON_OBJECT('id','L4','texto','MD5')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Hash'),
      JSON_OBJECT('id','R2','texto','Cifrado simétrico'),
      JSON_OBJECT('id','R3','texto','Cifrado asimétrico'),
      JSON_OBJECT('id','R4','texto','Hash (débil/obsoleto para integridad fuerte)')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(41,'ordenar',
  'Ordena fases típicas de respuesta a incidentes.',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('Preparación','Identificación','Contención','Erradicación','Recuperación','Lecciones aprendidas')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4,5))
);

CALL sp_seed_question(41,'numerica',
  '¿De cuántos bits es el resultado de SHA-256?',
  4,1,
  JSON_OBJECT('unidad','bits'),
  JSON_OBJECT('valor',256,'tolerancia',0)
);

CALL sp_seed_question(41,'opcion_multiple',
  'El principio de “mínimo privilegio” indica:',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Dar solo los permisos necesarios para la tarea',
    'Dar permisos de admin para evitar tickets',
    'Usar la misma contraseña para todos',
    'Desactivar logs'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(41,'verdadero_falso',
  'Una imagen forense debe obtenerse trabajando sobre el disco original en modo lectura/escritura.',
  6,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);

CALL sp_seed_question(41,'completar',
  'La cadena de custodia documenta quién tuvo la evidencia y en qué ?.',
  5,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','momento')))
);

CALL sp_seed_question(41,'opcion_multiple',
  '¿Qué es un IOC (Indicator of Compromise)?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Señal/artefacto que sugiere compromiso (hash, IP, dominio, etc.)',
    'Un tipo de CPU',
    'Un protocolo de routing',
    'Una política de backups'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(41,'ordenar',
  'Ordena por volatilidad (de más volátil a menos volátil).',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('Registros/CPU','RAM','Procesos/Conexiones activas','Disco/Archivos','Backups/Medios fríos')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3,4))
);

CALL sp_seed_question(41,'abierta',
  'Explica por qué se calcula un hash al crear una imagen forense.',
  6,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('integridad','verificacion','evidencia','no alteracion')),
  JSON_OBJECT('keywords', JSON_ARRAY('integridad','verificacion','evidencia','no alteracion'), 'min_hits', 3)
);

CALL sp_seed_question(41,'opcion_multiple',
  'En Linux, ¿qué comando se usa comúnmente para ver sockets/conexiones?',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('ss','ping','grep','chmod'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(41,'verdadero_falso',
  'El análisis de logs ayuda a detectar actividades anómalas y movimientos laterales.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(41,'numerica',
  'Puerto por defecto de SSH:',
  3,1,
  JSON_OBJECT('unidad','puerto'),
  JSON_OBJECT('valor',22,'tolerancia',0)
);



/* ============================================================================
  42) Ciberseguridad en redes (CSRE) -> materia_id = 42
============================================================================ */
CALL sp_seed_question(42,'opcion_multiple',
  '¿Qué protege principalmente un WAF (Web Application Firewall)?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY('Aplicaciones web (HTTP) contra ataques comunes','Cables de fibra','Baterías del servidor','Rutas BGP'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(42,'verdadero_falso',
  'Un IDS (solo detección) normalmente bloquea tráfico como un IPS.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', FALSE)
);

CALL sp_seed_question(42,'completar',
  'El puerto por defecto de HTTPS es ?.',
  3,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','443')))
);

CALL sp_seed_question(42,'relacionar',
  'Relaciona el componente con su función.',
  6,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','Firewall'),
      JSON_OBJECT('id','L2','texto','IDS'),
      JSON_OBJECT('id','L3','texto','IPS'),
      JSON_OBJECT('id','L4','texto','WAF')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Filtra/permite tráfico según reglas'),
      JSON_OBJECT('id','R2','texto','Detecta intrusiones (alerta)'),
      JSON_OBJECT('id','R3','texto','Previene/bloquea intrusiones'),
      JSON_OBJECT('id','R4','texto','Protege apps web (HTTP) y reglas específicas')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(42,'ordenar',
  'Ordena un endurecimiento básico de red (high level).',
  5,1,
  JSON_OBJECT('items', JSON_ARRAY('Cerrar superficies (puertos/servicios)','Aplicar parches','Configurar firewall/segmentación','Habilitar monitoreo/alertas')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(42,'numerica',
  'Tamaño mínimo común de llave RSA recomendada hoy en día (valor típico):',
  6,1,
  JSON_OBJECT('unidad','bits'),
  JSON_OBJECT('valor',2048,'tolerancia',0)
);

CALL sp_seed_question(42,'opcion_multiple',
  '¿Qué es un ataque DDoS?',
  5,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Saturar un servicio con tráfico desde múltiples fuentes',
    'Robar llaves privadas localmente',
    'Cambiar la máscara de red',
    'Actualizar firmware'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(42,'verdadero_falso',
  'La segmentación de red reduce la superficie de ataque y el movimiento lateral.',
  5,1,
  JSON_ARRAY(),
  JSON_OBJECT('correcta', TRUE)
);

CALL sp_seed_question(42,'completar',
  'La autenticación basada en certificados se apoya en una infraestructura ? (Public Key Infrastructure).',
  6,1,
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto'))),
  JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','PKI')))
);

CALL sp_seed_question(42,'opcion_multiple',
  'Herramienta común para escaneo de puertos:',
  4,1,
  JSON_OBJECT('opciones', JSON_ARRAY('nmap','curl','vim','grep'), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(42,'relacionar',
  'Relaciona ataque con una mitigación típica.',
  6,1,
  JSON_OBJECT(
    'version',2,
    'izq', JSON_ARRAY(
      JSON_OBJECT('id','L1','texto','Fuerza bruta'),
      JSON_OBJECT('id','L2','texto','MITM'),
      JSON_OBJECT('id','L3','texto','DDoS'),
      JSON_OBJECT('id','L4','texto','SQL Injection')
    ),
    'der', JSON_ARRAY(
      JSON_OBJECT('id','R1','texto','Rate limiting / MFA'),
      JSON_OBJECT('id','R2','texto','TLS y validación de certificados'),
      JSON_OBJECT('id','R3','texto','CDN/WAF/filtrado y capacidad elástica'),
      JSON_OBJECT('id','R4','texto','Queries parametrizadas / validación')
    ),
    'one_to_one', TRUE
  ),
  JSON_OBJECT(
    'version',2,
    'matches', JSON_ARRAY(
      JSON_OBJECT('izq_id','L1','der_id','R1'),
      JSON_OBJECT('izq_id','L2','der_id','R2'),
      JSON_OBJECT('izq_id','L3','der_id','R3'),
      JSON_OBJECT('izq_id','L4','der_id','R4')
    )
  )
);

CALL sp_seed_question(42,'ordenar',
  'Ordena pasos generales para levantar una VPN site-to-site.',
  6,1,
  JSON_OBJECT('items', JSON_ARRAY('Definir subredes y políticas','Intercambiar/negociar llaves','Establecer el túnel','Probar conectividad')),
  JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3))
);

CALL sp_seed_question(42,'abierta',
  'Explica la diferencia entre IDS e IPS.',
  5,1,
  JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('detectar','bloquear','alertas','inline')),
  JSON_OBJECT('keywords', JSON_ARRAY('detectar','bloquear','alertas','inline'), 'min_hits', 3)
);

CALL sp_seed_question(42,'opcion_multiple',
  '¿Qué significa “Zero Trust”?',
  6,1,
  JSON_OBJECT('opciones', JSON_ARRAY(
    'Nunca confíes por defecto; verifica siempre',
    'Confiar en todo dentro de la LAN',
    'Bloquear todo tráfico HTTP',
    'Usar solo VPN y ya'
  ), 'multiple', FALSE),
  JSON_OBJECT('correcta', JSON_ARRAY(0))
);

CALL sp_seed_question(42,'numerica',
  '¿Cuántos bits tiene una dirección IPv4?',
  4,1,
  JSON_OBJECT('unidad','bits'),
  JSON_OBJECT('valor',32,'tolerancia',0)
);


COMMIT;

/* Fin del seed */
