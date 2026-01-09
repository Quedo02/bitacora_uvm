USE bitacora_uvm;

-- ==========================================
-- CONFIG (ajusta si ocupas)
-- ==========================================
SET @AREA_ID     := 1;  -- Ingeniería
SET @CREATOR_ID  := 2;  -- usuario creador (coordinador)
SET @ADD_VOTE    := 1;  -- 1 = inserta voto aprobar, 0 = no insertar voto
SET @VOTER_ID    := 2;  -- usuario que vota

-- ==========================================
-- 1) Procedimiento base: inserta 1 pregunta + versión + area + (tema opcional) + voto opcional
-- ==========================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_seed_question $$
CREATE PROCEDURE sp_seed_question(
  IN p_materia_id INT,
  IN p_tipo VARCHAR(32),
  IN p_enunciado LONGTEXT,
  IN p_dificultad INT,
  IN p_parcial_id INT,
  IN p_contenido LONGTEXT,
  IN p_respuesta LONGTEXT
)
sp:BEGIN
  DECLARE v_dup INT DEFAULT 0;
  DECLARE v_pregunta_id BIGINT UNSIGNED;
  DECLARE v_version_id BIGINT UNSIGNED;
  DECLARE v_tema_id INT DEFAULT NULL;

  -- Evitar duplicados por enunciado (por materia)
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
    v_pregunta_id, 1,
    p_tipo, p_enunciado,
    p_dificultad,
    'parcial', p_parcial_id,
    p_contenido, p_respuesta,
    'aprobada', @CREATOR_ID, NOW(), NOW()
  );
  SET v_version_id = LAST_INSERT_ID();

  UPDATE pregunta
     SET version_actual_id = v_version_id,
         updated_at = NOW()
   WHERE id = v_pregunta_id;

  -- Asignar a área
  INSERT INTO pregunta_version_area(pregunta_version_id, area_id)
  VALUES (v_version_id, @AREA_ID);

  -- (Opcional) ligar a un tema existente de esa materia/parcial (si hay)
  SELECT t.id
    INTO v_tema_id
  FROM tema t
  WHERE t.materia_id = p_materia_id
    AND t.estado = 'activo'
    AND (t.parcial_id = p_parcial_id OR t.parcial_id IS NULL)
  ORDER BY RAND()
  LIMIT 1;

  IF v_tema_id IS NOT NULL THEN
    INSERT IGNORE INTO pregunta_version_tema(pregunta_version_id, tema_id)
    VALUES (v_version_id, v_tema_id);
  END IF;

  -- (Opcional) voto de aprobación
  IF @ADD_VOTE = 1 THEN
    INSERT IGNORE INTO pregunta_voto(pregunta_version_id, area_id, votante_id, decision, comentario, created_at, updated_at)
    VALUES (v_version_id, @AREA_ID, @VOTER_ID, 'aprobar', NULL, NOW(), NOW());
  END IF;
END $$

-- ==========================================
-- 2) Generador: crea N preguntas "realistas" (plantillas) para 1 materia
-- ==========================================
DROP PROCEDURE IF EXISTS sp_seed_n_questions_materia $$
CREATE PROCEDURE sp_seed_n_questions_materia(
  IN p_materia_id INT,
  IN p_n INT
)
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE v_start INT DEFAULT 0;
  DECLARE v_materia_nombre VARCHAR(100) DEFAULT '';
  DECLARE v_lname VARCHAR(200) DEFAULT '';
  DECLARE v_topic VARCHAR(32) DEFAULT 'general';

  DECLARE v_tipo VARCHAR(32);
  DECLARE v_enunciado LONGTEXT;
  DECLARE v_contenido LONGTEXT;
  DECLARE v_respuesta LONGTEXT;
  DECLARE v_diff INT;
  DECLARE v_parcial INT;
  DECLARE v_variant INT;

  SELECT COALESCE(m.nombre_materia, CONCAT('Materia ', p_materia_id))
    INTO v_materia_nombre
  FROM materia m
  WHERE m.id = p_materia_id
  LIMIT 1;

  SET v_lname = LOWER(v_materia_nombre);

  -- Clasificación por tema (heurística por nombre)
  SET v_topic = CASE
    WHEN v_lname LIKE '%red%' OR v_lname LIKE '%network%' THEN 'redes'
    WHEN v_lname LIKE '%base%' OR v_lname LIKE '%datos%' OR v_lname LIKE '%sql%' THEN 'bd'
    WHEN v_lname LIKE '%operativ%' OR v_lname LIKE '%kernel%' THEN 'so'
    WHEN v_lname LIKE '%concurr%' OR v_lname LIKE '%hilo%' THEN 'concurrencia'
    WHEN v_lname LIKE '%objeto%' OR v_lname LIKE '%poo%' OR v_lname LIKE '%orientada%' THEN 'poo'
    WHEN v_lname LIKE '%seguridad%' OR v_lname LIKE '%forense%' OR v_lname LIKE '%ciber%' THEN 'seguridad'
    WHEN v_lname LIKE '%nube%' OR v_lname LIKE '%cloud%' THEN 'nube'
    WHEN v_lname LIKE '%web%' OR v_lname LIKE '%api%' OR v_lname LIKE '%http%' THEN 'web'
    WHEN v_lname LIKE '%arquitect%' OR v_lname LIKE '%computador%' OR v_lname LIKE '%micro%' THEN 'arq'
    WHEN v_lname LIKE '%discret%' OR v_lname LIKE '%matemat%' OR v_lname LIKE '%lógica%' OR v_lname LIKE '%logica%' THEN 'mate'
    ELSE 'general'
  END;

  -- Cuántas ya tiene (para numeración única)
  SELECT COUNT(*)
    INTO v_start
  FROM pregunta p
  WHERE p.materia_id = p_materia_id;

  WHILE i < p_n DO
    SET v_parcial = 1 + MOD(v_start + i, 3);         -- 1..3
    SET v_diff    = 2 + MOD(v_start + i, 6);         -- 2..7
    SET v_variant = MOD(v_start + i, 3);             -- 0..2

    -- rotamos tipos
    SET v_tipo = CASE MOD(v_start + i, 7)
      WHEN 0 THEN 'opcion_multiple'
      WHEN 1 THEN 'verdadero_falso'
      WHEN 2 THEN 'completar'
      WHEN 3 THEN 'ordenar'
      WHEN 4 THEN 'relacionar'
      WHEN 5 THEN 'numerica'
      ELSE 'abierta'
    END;

    -- ---------------------------
    -- Plantillas por tipo + topic
    -- ---------------------------
    IF v_tipo = 'opcion_multiple' THEN
      IF v_topic = 'redes' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Qué protocolo resuelve nombres de dominio a direcciones IP?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY('DNS','DHCP','ARP','ICMP'), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSEIF v_topic = 'bd' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Qué restricción garantiza unicidad e identificación de una fila?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY('PRIMARY KEY','FOREIGN KEY','CHECK','VIEW'), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSEIF v_topic = 'so' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Cuál es la diferencia más común entre proceso e hilo?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY(
          'Un proceso tiene su propio espacio de direcciones; los hilos comparten memoria del proceso',
          'Un hilo siempre es más pesado que un proceso',
          'Un proceso no puede crear hilos',
          'Son exactamente lo mismo'
        ), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSEIF v_topic = 'poo' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Qué describe mejor la encapsulación?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY(
          'Ocultar estado interno y exponer una interfaz',
          'Copiar objetos por referencia siempre',
          'Evitar el uso de clases',
          'Convertir todo a JSON'
        ), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSEIF v_topic = 'seguridad' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Cuál es la diferencia principal entre hash y cifrado?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY(
          'El hash es unidireccional; el cifrado es reversible con una llave',
          'El hash requiere internet; el cifrado no',
          'El hash solo funciona con texto',
          'Son lo mismo'
        ), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSEIF v_topic = 'nube' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Qué modelo ofrece VMs y redes, pero tú administras el sistema operativo?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY('IaaS','PaaS','SaaS','On-prem'), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSEIF v_topic = 'web' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Qué método HTTP se usa típicamente para obtener un recurso sin modificarlo?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY('GET','POST','DELETE','PATCH'), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSEIF v_topic = 'arq' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Qué componente ejecuta instrucciones y coordina el sistema?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY('CPU','RAM','GPU','SSD'), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSEIF v_topic = 'mate' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] La implicación p → q es equivalente a:');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY('¬p ∨ q','p ∧ q','¬p ∧ ¬q','p ∨ q'), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));

      ELSE
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Cuál práctica mejora mantenibilidad en proyectos?');
        SET v_contenido = JSON_OBJECT('opciones', JSON_ARRAY('Documentar decisiones','Evitar pruebas','No usar control de versiones','Hardcodear credenciales'), 'multiple', FALSE);
        SET v_respuesta = JSON_OBJECT('correcta', JSON_ARRAY(0));
      END IF;

    ELSEIF v_tipo = 'verdadero_falso' THEN
      SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] La documentación técnica reduce deuda técnica a largo plazo.');
      SET v_contenido = JSON_ARRAY();
      SET v_respuesta = JSON_OBJECT('correcta', TRUE);

    ELSEIF v_tipo = 'completar' THEN
      SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Completa: Una buena práctica aquí es ?.');
      SET v_contenido = JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'placeholder','?','tipo','texto')));
      SET v_respuesta = JSON_OBJECT('blanks', JSON_ARRAY(JSON_OBJECT('id',1,'valor','validación')));

    ELSEIF v_tipo = 'ordenar' THEN
      SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Ordena un flujo típico de trabajo.');
      SET v_contenido = JSON_OBJECT('items', JSON_ARRAY('Planear','Implementar','Probar','Documentar'));
      SET v_respuesta = JSON_OBJECT('orden', JSON_ARRAY(0,1,2,3));

    ELSEIF v_tipo = 'relacionar' THEN
      SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Relaciona concepto con definición.');
      SET v_contenido = JSON_OBJECT(
        'version',2,
        'izq', JSON_ARRAY(
          JSON_OBJECT('id','L1','texto','Concepto'),
          JSON_OBJECT('id','L2','texto','Ejemplo')
        ),
        'der', JSON_ARRAY(
          JSON_OBJECT('id','R1','texto', CONCAT('Definición breve en ', v_materia_nombre)),
          JSON_OBJECT('id','R2','texto', CONCAT('Caso práctico en ', v_materia_nombre))
        ),
        'one_to_one', TRUE
      );
      SET v_respuesta = JSON_OBJECT(
        'version',2,
        'matches', JSON_ARRAY(
          JSON_OBJECT('izq_id','L1','der_id','R1'),
          JSON_OBJECT('izq_id','L2','der_id','R2')
        )
      );

    ELSEIF v_tipo = 'numerica' THEN
      IF v_topic = 'redes' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Cuántos bits tiene una dirección IPv4?');
        SET v_contenido = JSON_OBJECT('unidad','bits');
        SET v_respuesta = JSON_OBJECT('valor',32,'tolerancia',0);

      ELSEIF v_topic = 'bd' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Si n=1024, ¿cuánto vale log2(n)?');
        SET v_contenido = JSON_OBJECT('unidad','aprox');
        SET v_respuesta = JSON_OBJECT('valor',10,'tolerancia',0);

      ELSEIF v_topic = 'arq' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Si el offset de página es de 12 bits, ¿de qué tamaño es la página (bytes)?');
        SET v_contenido = JSON_OBJECT('unidad','bytes');
        SET v_respuesta = JSON_OBJECT('valor',4096,'tolerancia',0);

      ELSEIF v_topic = 'nube' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Si pasas de 3 instancias a 6 instancias, el factor de escalamiento es:');
        SET v_contenido = JSON_OBJECT('unidad','factor');
        SET v_respuesta = JSON_OBJECT('valor',2,'tolerancia',0);

      ELSE
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] ¿Cuánto vale 7 % 3?');
        SET v_contenido = JSON_OBJECT('unidad','entero');
        SET v_respuesta = JSON_OBJECT('valor',1,'tolerancia',0);
      END IF;

    ELSEIF v_tipo = 'abierta' THEN
      IF v_topic = 'web' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Explica qué es paginación (limit/offset o cursor) y por qué es útil.');
        SET v_contenido = JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('limit','offset','cursor','performance'));
        SET v_respuesta = JSON_OBJECT('keywords', JSON_ARRAY('limit','offset','cursor','performance'), 'min_hits', 2);

      ELSEIF v_topic = 'bd' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Explica qué es la 3FN y por qué ayuda.');
        SET v_contenido = JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('dependencia','transitiva','clave','redundancia'));
        SET v_respuesta = JSON_OBJECT('keywords', JSON_ARRAY('dependencia','transitiva','clave','redundancia'), 'min_hits', 2);

      ELSEIF v_topic = 'so' THEN
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Explica la diferencia entre memoria virtual y memoria física.');
        SET v_contenido = JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('virtual','fisica','paginacion','MMU','swap'));
        SET v_respuesta = JSON_OBJECT('keywords', JSON_ARRAY('virtual','fisica','paginacion','MMU','swap'), 'min_hits', 2);

      ELSE
        SET v_enunciado = CONCAT('(', v_materia_nombre, ') [Auto ', v_start+i+1, '] Explica un concepto importante y da un ejemplo práctico.');
        SET v_contenido = JSON_OBJECT('rubrica', JSON_ARRAY(), 'keywords', JSON_ARRAY('concepto','ejemplo','aplicacion'));
        SET v_respuesta = JSON_OBJECT('keywords', JSON_ARRAY('concepto','ejemplo','aplicacion'), 'min_hits', 2);
      END IF;

    END IF;

    CALL sp_seed_question(
      p_materia_id, v_tipo, v_enunciado, v_diff, v_parcial,
      v_contenido, v_respuesta
    );

    SET i = i + 1;
  END WHILE;
END $$

-- ==========================================
-- 3) Recorre materias del área (materia_area) y completa hasta 15
-- ==========================================
DROP PROCEDURE IF EXISTS sp_fill_15_questions_area $$
CREATE PROCEDURE sp_fill_15_questions_area(IN p_area_id INT)
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_materia_id INT;
  DECLARE v_cnt INT;
  DECLARE v_missing INT;

  DECLARE cur CURSOR FOR
    SELECT ma.materia_id
    FROM materia_area ma
    JOIN materia m ON m.id = ma.materia_id
    WHERE ma.area_id = p_area_id
      AND ma.estado = 'activa'
      AND m.estado  = 'activa';

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO v_materia_id;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    SELECT COUNT(*)
      INTO v_cnt
    FROM pregunta p
    WHERE p.materia_id = v_materia_id;

    SET v_missing = 15 - v_cnt;

    IF v_missing > 0 THEN
      CALL sp_seed_n_questions_materia(v_materia_id, v_missing);
    END IF;
  END LOOP;

  CLOSE cur;
END $$

DELIMITER ;

-- ==========================================
-- EJECUCIÓN
-- ==========================================
CALL sp_fill_15_questions_area(@AREA_ID);

-- (Opcional) si quieres limpiar los SP al final, descomenta:
-- DROP PROCEDURE IF EXISTS sp_fill_15_questions_area;
-- DROP PROCEDURE IF EXISTS sp_seed_n_questions_materia;
-- DROP PROCEDURE IF EXISTS sp_seed_question;
