-- =========================================================
--  BITACORA UVM (SCHEMA + VIEWS + SEED AL FINAL)
-- =========================================================

DROP DATABASE IF EXISTS bitacora_uvm;
CREATE DATABASE bitacora_uvm
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE bitacora_uvm;

-- =========================================================
--  1) ROLES
-- =========================================================
CREATE TABLE rol (
    id          TINYINT UNSIGNED NOT NULL,
    nombre      VARCHAR(50) NOT NULL,
    descripcion VARCHAR(120) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_rol_nombre (nombre)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  1.1 ROLES
-- -------------------------
INSERT INTO rol (id, nombre, descripcion) VALUES
(1, 'admin', 'Administrador'),
(2, 'coordinador', 'Coordinador de área'),
(3, 'docente_tc', 'Docente tiempo completo'),
(4, 'docente_general', 'Docente general'),
(5, 'estudiante', 'Alumno');

-- =========================================================
--  2) USUARIO BASE
-- =========================================================
CREATE TABLE usuario (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    rol_id          TINYINT UNSIGNED NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    correo          VARCHAR(180) NOT NULL,
    matricula       BIGINT UNSIGNED NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    estado          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_usuario_correo (correo),
    UNIQUE KEY ux_usuario_matricula (matricula),
    KEY ix_usuario_rol_id (rol_id),
    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (rol_id)
        REFERENCES rol (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  2.1 USUARIOS
-- -------------------------
INSERT INTO usuario
(id, rol_id, nombre_completo, correo, matricula, password_hash, estado, created_at, updated_at)
VALUES
(1, 1, 'Admin Juan Pablo', 'admin@uvm.edu', 100136748,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(2, 2, 'Coord Sistemas Oscar', 'inge@uvm.edu', 100136749,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(3, 2, 'Coord Salud Maria', 'salud@uvm.edu', 100136750,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(4, 3, 'Docente TC Carcaño', 'carcano@uvm.edu', 100136756,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(5, 4, 'Docente General Ericka', 'ericka@uvm.edu', 100136755,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(6, 5, 'Ana Torres', 'estudiante1@uvm.edu', 100200001,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(7, 5, 'Luis Herrera', 'estudiante2@uvm.edu', 100200002,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(8, 5, 'Sofia Reyes', 'estudiante3@uvm.edu', 100200003,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(9, 5, 'Diego Cruz', 'estudiante4@uvm.edu', 100200004,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(10, 5, 'Andrea Luna', 'estuidante5@uvm.edu', 100200007,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(11, 5, 'Jorge Salas', 'estudiante6@uvm.edu', 100200008,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(12, 5, 'Paola Nieto', 'estudiante7@uvm.edu', 100200009,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(13, 5, 'Ricardo Vega', 'estudiante8@uvm.edu', 100200010,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW());

-- =========================================================
--  3) AREA
-- =========================================================
CREATE TABLE area (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre     VARCHAR(120) NOT NULL,
    estado     ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_area_nombre (nombre)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  3.1 AREAS
-- -------------------------
INSERT INTO area (id, nombre, estado, created_at, updated_at) VALUES
(1, 'Ingenieria', 'activa', NOW(), NOW()),
(2, 'Salud',      'activa', NOW(), NOW());

-- =========================================================
--  4) PERFILES
-- =========================================================
CREATE TABLE coordinador_profile (
    usuario_id INT UNSIGNED NOT NULL,
    area_id    INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id),
    KEY ix_coord_area_id (area_id),
    CONSTRAINT fk_coord_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_coord_area
        FOREIGN KEY (area_id)
        REFERENCES area (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE docente_profile (
    usuario_id INT UNSIGNED NOT NULL,
    categoria  ENUM('general','tiempo_completo') NOT NULL DEFAULT 'general',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id),
    CONSTRAINT fk_doc_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- -------------------------
--  4.1 PERFILES
-- -------------------------
INSERT INTO coordinador_profile (usuario_id, area_id, created_at, updated_at) VALUES
(2, 1, NOW(), NOW()),
(3, 2, NOW(), NOW());

INSERT INTO docente_profile (usuario_id, categoria, created_at, updated_at) VALUES
(4,  'general',         NOW(), NOW()),
(5,  'tiempo_completo', NOW(), NOW());

-- =========================================================
--  5) CARRERA
-- =========================================================
CREATE TABLE carrera (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_carrera VARCHAR(120) NOT NULL,
    codigo_carrera VARCHAR(80) NOT NULL,
    area_id        INT UNSIGNED NOT NULL,
    coordinador_id INT UNSIGNED DEFAULT NULL,
    estado         ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_carrera_codigo (codigo_carrera),
    KEY ix_carrera_area_id (area_id),
    KEY ix_carrera_coordinador_id (coordinador_id),
    CONSTRAINT fk_carrera_area
        FOREIGN KEY (area_id)
        REFERENCES area (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_carrera_coordinador
        FOREIGN KEY (coordinador_id)
        REFERENCES usuario (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  5.1 CARRERAS
-- -------------------------
INSERT INTO carrera (id, nombre_carrera, codigo_carrera, area_id, coordinador_id, estado, created_at, updated_at) VALUES
(1, 'Ingeniería en sistemas computacionales',   'ISC',      1, 2,  'activa', NOW(), NOW()),
(2, 'Ingeniería Mecatronica',                   'IMEC',     1, 2,  'activa', NOW(), NOW()),
(3, 'Medicina General',                         'MED',      2, 3,  'activa', NOW(), NOW()),
(4, 'Nutrición',                                'NUTRI',    2, 3,  'activa', NOW(), NOW());

-- =========================================================
--  6) ESTUDIANTE PERFIL
-- =========================================================
CREATE TABLE estudiante_profile (
    usuario_id INT UNSIGNED NOT NULL,
    carrera_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id),
    KEY ix_est_carrera_id (carrera_id),
    CONSTRAINT fk_est_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_est_carrera
        FOREIGN KEY (carrera_id)
        REFERENCES carrera (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  6.1 ESTUDIANTE PROFILE
-- -------------------------
INSERT INTO estudiante_profile (usuario_id, carrera_id, created_at, updated_at) VALUES
(6,  1, NOW(), NOW()),
(7,  1, NOW(), NOW()),
(8,  2, NOW(), NOW()),
(9,  2, NOW(), NOW()),
(10, 3, NOW(), NOW()),
(11, 3, NOW(), NOW()),
(12, 4, NOW(), NOW()),
(13, 4, NOW(), NOW());

-- =========================================================
--  7) MATERIA (CATÁLOGO GLOBAL)
-- =========================================================
CREATE TABLE materia (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_materia  VARCHAR(100) NOT NULL,
    codigo_materia  VARCHAR(80) NOT NULL,
    tipo_evaluacion ENUM('teorica','practica') NOT NULL DEFAULT 'teorica',
    estado          ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_materia_codigo (codigo_materia),
    KEY ix_materia_nombre (nombre_materia)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  7.1 MATERIAS
-- -------------------------
INSERT INTO materia (id, nombre_materia, codigo_materia, tipo_evaluacion, estado, created_at, updated_at) VALUES
(1, 'Bases de datos',   'BDC0001', 'teorica', 'activa', NOW(), NOW()),
(2, 'Programacion I',   'PGC0001', 'practica','activa', NOW(), NOW()),
(3, 'Circuitos',        'CTC0001', 'teorica', 'activa', NOW(), NOW()),
(4, 'Compuertas',       'CPC0001', 'practica','activa', NOW(), NOW()),
(5, 'Anatomia',         'ATC0001', 'teorica', 'activa', NOW(), NOW()),
(6, 'Inyecciones',      'IYC0001', 'practica','activa', NOW(), NOW()),
(7, 'Comidas I',        'CMC0001', 'teorica', 'activa', NOW(), NOW()),
(8, 'Ejercicios I',     'EJC0001', 'practica','activa', NOW(), NOW()),
(9, 'Tronco comun I',   'TCC0001', 'teorica', 'activa', NOW(), NOW());

-- =========================================================
--  8) CARRERA_MATERIA (PLAN DE ESTUDIOS)
-- =========================================================
CREATE TABLE carrera_materia (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    carrera_id   INT UNSIGNED NOT NULL,
    materia_id   INT UNSIGNED NOT NULL,
    num_semestre TINYINT UNSIGNED NOT NULL,
    estado       ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_carrera_materia (carrera_id, materia_id),
    KEY ix_cm_carrera_semestre (carrera_id, num_semestre),
    CONSTRAINT fk_cm_carrera
        FOREIGN KEY (carrera_id)
        REFERENCES carrera (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_cm_materia
        FOREIGN KEY (materia_id)
        REFERENCES materia (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  8.1 CARRERA_MATERIA
-- -------------------------
INSERT INTO carrera_materia (carrera_id, materia_id, num_semestre, estado, created_at, updated_at) VALUES
(1, 1, 1, 'activa', NOW(), NOW()),
(1, 2, 1, 'activa', NOW(), NOW()),
(1, 9, 1, 'activa', NOW(), NOW()),
(2, 3, 1, 'activa', NOW(), NOW()),
(2, 4, 1, 'activa', NOW(), NOW()),
(2, 9, 1, 'activa', NOW(), NOW()),
(3, 5, 1, 'activa', NOW(), NOW()),
(3, 6, 1, 'activa', NOW(), NOW()),
(3, 9, 1, 'activa', NOW(), NOW()),
(4, 7, 1, 'activa', NOW(), NOW()),
(4, 8, 1, 'activa', NOW(), NOW()),
(4, 9, 1, 'activa', NOW(), NOW());

-- =========================================================
--  9) PERIODO
-- =========================================================
CREATE TABLE periodo (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo       VARCHAR(10) NOT NULL,
    nombre       VARCHAR(60) NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin    DATE NOT NULL,
    estado       ENUM('planeado','activo','cerrado') NOT NULL DEFAULT 'planeado',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_periodo_codigo (codigo),
    KEY ix_periodo_fechas (fecha_inicio, fecha_fin)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  14.9 PERIODOS
-- -------------------------
INSERT INTO periodo (id, codigo, nombre, fecha_inicio, fecha_fin, estado, created_at, updated_at) VALUES
(1, '2025-C1', 'Primavera', '2025-02-20', '2025-07-17', 'cerrado',  NOW(), NOW()),
(2, '2025-C2', 'Otoño',     '2025-08-18', '2026-01-17', 'activo',   NOW(), NOW()),
(3, '2026-C1', 'Primavera', '2026-02-20', '2026-07-17', 'planeado', NOW(), NOW());

-- =========================================================
--  10) SECCION (LA "CLASE REAL" DEL SEMESTRE)
-- =========================================================
CREATE TABLE seccion (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    materia_id INT UNSIGNED NOT NULL,
    carrera_id INT UNSIGNED NOT NULL,
    periodo_id INT UNSIGNED NOT NULL,
    grupo      VARCHAR(10) NOT NULL,
    docente_id INT UNSIGNED DEFAULT NULL,
    modalidad  ENUM('presencial','linea','mixta') NOT NULL DEFAULT 'presencial',
    estado     ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_seccion_unique (materia_id, carrera_id, periodo_id, grupo),
    KEY ix_seccion_materia_id (materia_id),
    KEY ix_seccion_carrera_id (carrera_id),
    KEY ix_seccion_periodo_id (periodo_id),
    KEY ix_seccion_docente_id (docente_id),
    CONSTRAINT fk_seccion_materia
        FOREIGN KEY (materia_id)
        REFERENCES materia (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_seccion_carrera
        FOREIGN KEY (carrera_id)
        REFERENCES carrera (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_seccion_periodo
        FOREIGN KEY (periodo_id)
        REFERENCES periodo (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_seccion_docente
        FOREIGN KEY (docente_id)
        REFERENCES usuario (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  10.1 SECCIONES
-- -------------------------
INSERT INTO seccion
(id, materia_id, carrera_id, periodo_id, grupo, docente_id, modalidad, estado, created_at, updated_at)
VALUES
(1, 1, 1, 1, 'ISCBDC001', 2, 'presencial', 'activa', NOW(), NOW()), 
(2, 2, 1, 1, 'ISCPGC001', 4, 'presencial', 'activa', NOW(), NOW()), 
(3, 3, 2, 1, 'IMECCTC01', 2, 'presencial', 'activa', NOW(), NOW()), 
(4, 4, 2, 1, 'IMECCPC01', 4, 'presencial', 'activa', NOW(), NOW()), 
(5, 5, 3, 1, 'MEDATC001', 3, 'presencial', 'activa', NOW(), NOW()), 
(6, 6, 3, 1, 'MEDIYC001', 5, 'presencial', 'activa', NOW(), NOW()), 
(7, 7, 4, 1, 'NUTRICMC1', 3, 'presencial', 'activa', NOW(), NOW()), 
(8, 8, 4, 1, 'NUTRIEJC1', 5, 'presencial', 'activa', NOW(), NOW()), 
(9, 9, 1, 1, 'TCTCC0001', 5, 'presencial', 'activa', NOW(), NOW()), 
(10,9, 1, 1, 'TCTCC0002', 5, 'linea',      'activa', NOW(), NOW()), 

(11, 1, 1, 2, 'ISCBDC002', 2, 'presencial', 'activa', NOW(), NOW()), 
(12, 2, 1, 2, 'ISCPGC002', 4, 'presencial', 'activa', NOW(), NOW()), 
(13, 3, 2, 2, 'IMECCTC02', 2, 'presencial', 'activa', NOW(), NOW()), 
(14, 4, 2, 2, 'IMECCPC02', 4, 'presencial', 'activa', NOW(), NOW()), 
(15, 5, 3, 2, 'MEDATC002', 3, 'presencial', 'activa', NOW(), NOW()), 
(16, 6, 3, 2, 'MEDIYC002', 5, 'presencial', 'activa', NOW(), NOW()), 
(17, 7, 4, 2, 'NUTRICMC2', 3, 'presencial', 'activa', NOW(), NOW()), 
(18, 8, 4, 2, 'NUTRIEJC2', 5, 'presencial', 'activa', NOW(), NOW()), 
(19, 9, 1, 2, 'TCTCC0003', 5, 'presencial', 'activa', NOW(), NOW()), 
(20, 9, 1, 2, 'TCTCC0004', 5, 'linea',      'activa', NOW(), NOW()), 

(21, 1, 1, 3, 'ISCBDC003', 2, 'presencial', 'activa', NOW(), NOW()), 
(22, 2, 1, 3, 'ISCPGC003', 4, 'presencial', 'activa', NOW(), NOW()), 
(23, 3, 2, 3, 'IMECCTC03', 2, 'presencial', 'activa', NOW(), NOW()), 
(24, 4, 2, 3, 'IMECCPC03', 4, 'presencial', 'activa', NOW(), NOW()), 
(25, 5, 3, 3, 'MEDATC003', 3, 'presencial', 'activa', NOW(), NOW()), 
(26, 6, 3, 3, 'MEDIYC003', 5, 'presencial', 'activa', NOW(), NOW()), 
(27, 7, 4, 3, 'NUTRICMC3', 3, 'presencial', 'activa', NOW(), NOW()), 
(28, 8, 4, 3, 'NUTRIEJC3', 5, 'presencial', 'activa', NOW(), NOW()), 
(29, 9, 1, 3, 'TCTCC0005', 5, 'presencial', 'activa', NOW(), NOW()), 
(30, 9, 1, 3, 'TCTCC0006', 5, 'linea',      'activa', NOW(), NOW()); 

-- =========================================================
--  11) SECCION_COMPONENTE (3 CRN POR SECCION)
-- =========================================================
CREATE TABLE seccion_componente (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    seccion_id      INT UNSIGNED NOT NULL,
    tipo            ENUM('continua','blackboard','examen') NOT NULL,
    crn             VARCHAR(30) NOT NULL,
    peso_porcentaje DECIMAL(5,2) DEFAULT NULL,
    estado          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_sc_seccion_tipo (seccion_id, tipo),
    UNIQUE KEY ux_sc_crn (crn),
    KEY ix_sc_seccion_id (seccion_id),
    CONSTRAINT fk_sc_seccion
        FOREIGN KEY (seccion_id)
        REFERENCES seccion (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  11.1 SECCION_COMPONENTE (3 CRN c/u)
-- -------------------------
INSERT INTO seccion_componente
(seccion_id, tipo, crn, peso_porcentaje, estado, created_at, updated_at)
VALUES
-- 2025-C1 (prefijo 2501)
(1, 'blackboard', '2501-BD-ISC-BB',    50.00, 'activo', NOW(), NOW()),
(1, 'continua',   '2501-BD-ISC-CONT',  20.00, 'activo', NOW(), NOW()),
(1, 'examen',     '2501-BD-ISC-EX',    30.00, 'activo', NOW(), NOW()),
(2, 'blackboard', '2501-PG-ISC-BB',    50.00, 'activo', NOW(), NOW()),
(2, 'continua',   '2501-PG-ISC-CONT',  40.00, 'activo', NOW(), NOW()),
(2, 'examen',     '2501-PG-ISC-EX',    10.00, 'activo', NOW(), NOW()),
(3, 'blackboard', '2501-CT-IMEC-BB',   50.00, 'activo', NOW(), NOW()),
(3, 'continua',   '2501-CT-IMEC-CONT', 20.00, 'activo', NOW(), NOW()),
(3, 'examen',     '2501-CT-IMEC-EX',   30.00, 'activo', NOW(), NOW()),
(4, 'blackboard', '2501-CP-IMEC-BB',   50.00, 'activo', NOW(), NOW()),
(4, 'continua',   '2501-CP-IMEC-CONT', 40.00, 'activo', NOW(), NOW()),
(4, 'examen',     '2501-CP-IMEC-EX',   10.00, 'activo', NOW(), NOW()),
(5, 'blackboard', '2501-AT-MED-BB',    50.00, 'activo', NOW(), NOW()),
(5, 'continua',   '2501-AT-MED-CONT',  20.00, 'activo', NOW(), NOW()),
(5, 'examen',     '2501-AT-MED-EX',    30.00, 'activo', NOW(), NOW()),
(6, 'blackboard', '2501-MED-IY-BB',    50.00, 'activo', NOW(), NOW()),
(6, 'continua',   '2501-MED-IY-CONT',  40.00, 'activo', NOW(), NOW()),
(6, 'examen',     '2501-MED-IY-EX',    10.00, 'activo', NOW(), NOW()),
(7, 'blackboard', '2501-CM-NUTRI-BB',  50.00, 'activo', NOW(), NOW()),
(7, 'continua',   '2501-CM-NUTRI-CONT',20.00, 'activo', NOW(), NOW()),
(7, 'examen',     '2501-CM-NUTRI-EX',  30.00, 'activo', NOW(), NOW()),
(8, 'blackboard', '2501-EJ-NUTRI-BB',  50.00, 'activo', NOW(), NOW()),
(8, 'continua',   '2501-EJ-NUTRI-CONT',40.00, 'activo', NOW(), NOW()),
(8, 'examen',     '2501-EJ-NUTRI-EX',  10.00, 'activo', NOW(), NOW()),
(9, 'blackboard', '2501-TC-TC-BB',     50.00, 'activo', NOW(), NOW()),
(9, 'continua',   '2501-TC-TC-CONT',   20.00, 'activo', NOW(), NOW()),
(9, 'examen',     '2501-TC-TC-EX',     30.00, 'activo', NOW(), NOW()),
(10,'blackboard', '2501-TC-TC-BB-02',  50.00, 'activo', NOW(), NOW()),
(10,'continua',   '2501-TC-TC-CONT-02',40.00, 'activo', NOW(), NOW()),
(10,'examen',     '2501-TC-TC-EX02',   10.00, 'activo', NOW(), NOW()),
-- 2025-C2 (prefijo 2502)
(11, 'blackboard', '2502-BD-ISC-BB',    50.00, 'activo', NOW(), NOW()),
(11, 'continua',   '2502-BD-ISC-CONT',  20.00, 'activo', NOW(), NOW()),
(11, 'examen',     '2502-BD-ISC-EX',    30.00, 'activo', NOW(), NOW()),
(12, 'blackboard', '2502-PG-ISC-BB',    50.00, 'activo', NOW(), NOW()),
(12, 'continua',   '2502-PG-ISC-CONT',  40.00, 'activo', NOW(), NOW()),
(12, 'examen',     '2502-PG-ISC-EX',    10.00, 'activo', NOW(), NOW()),
(13, 'blackboard', '2502-CT-IMEC-BB',   50.00, 'activo', NOW(), NOW()),
(13, 'continua',   '2502-CT-IMEC-CONT', 20.00, 'activo', NOW(), NOW()),
(13, 'examen',     '2502-CT-IMEC-EX',   30.00, 'activo', NOW(), NOW()),
(14, 'blackboard', '2502-CP-IMEC-BB',   50.00, 'activo', NOW(), NOW()),
(14, 'continua',   '2502-CP-IMEC-CONT', 40.00, 'activo', NOW(), NOW()),
(14, 'examen',     '2502-CP-IMEC-EX',   10.00, 'activo', NOW(), NOW()),
(15, 'blackboard', '2502-AT-MED-BB',    50.00, 'activo', NOW(), NOW()),
(15, 'continua',   '2502-AT-MED-CONT',  20.00, 'activo', NOW(), NOW()),
(15, 'examen',     '2502-AT-MED-EX',    30.00, 'activo', NOW(), NOW()),
(16, 'blackboard', '2502-MED-IY-BB',    50.00, 'activo', NOW(), NOW()),
(16, 'continua',   '2502-MED-IY-CONT',  40.00, 'activo', NOW(), NOW()),
(16, 'examen',     '2502-MED-IY-EX',    10.00, 'activo', NOW(), NOW()),
(17, 'blackboard', '2502-CM-NUTRI-BB',  50.00, 'activo', NOW(), NOW()),
(17, 'continua',   '2502-CM-NUTRI-CONT',20.00, 'activo', NOW(), NOW()),
(17, 'examen',     '2502-CM-NUTRI-EX',  30.00, 'activo', NOW(), NOW()),
(18, 'blackboard', '2502-EJ-NUTRI-BB',  50.00, 'activo', NOW(), NOW()),
(18, 'continua',   '2502-EJ-NUTRI-CONT',40.00, 'activo', NOW(), NOW()),
(18, 'examen',     '2502-EJ-NUTRI-EX',  10.00, 'activo', NOW(), NOW()),
(19, 'blackboard', '2502-TC-TC-BB',     50.00, 'activo', NOW(), NOW()),
(19, 'continua',   '2502-TC-TC-CONT',   20.00, 'activo', NOW(), NOW()),
(19, 'examen',     '2502-TC-TC-EX',     30.00, 'activo', NOW(), NOW()),
(20, 'blackboard', '2502-TC-TC-BB-02',  50.00, 'activo', NOW(), NOW()),
(20, 'continua',   '2502-TC-TC-CONT-02',40.00, 'activo', NOW(), NOW()),
(20, 'examen',     '2502-TC-TC-EX-02',  10.00, 'activo', NOW(), NOW()),
-- 2026-C1 (prefijo 2601)
(21, 'blackboard', '2601-BD-ISC-BB',    50.00, 'activo', NOW(), NOW()),
(21, 'continua',   '2601-BD-ISC-CONT',  20.00, 'activo', NOW(), NOW()),
(21, 'examen',     '2601-BD-ISC-EX',    30.00, 'activo', NOW(), NOW()),
(22, 'blackboard', '2601-PG-ISC-BB',    50.00, 'activo', NOW(), NOW()),
(22, 'continua',   '2601-PG-ISC-CONT',  40.00, 'activo', NOW(), NOW()),
(22, 'examen',     '2601-PG-ISC-EX',    10.00, 'activo', NOW(), NOW()),
(23, 'blackboard', '2601-CT-IMEC-BB',   50.00, 'activo', NOW(), NOW()),
(23, 'continua',   '2601-CT-IMEC-CONT', 20.00, 'activo', NOW(), NOW()),
(23, 'examen',     '2601-CT-IMEC-EX',   30.00, 'activo', NOW(), NOW()),
(24, 'blackboard', '2601-CP-IMEC-BB',   50.00, 'activo', NOW(), NOW()),
(24, 'continua',   '2601-CP-IMEC-CONT', 40.00, 'activo', NOW(), NOW()),
(24, 'examen',     '2601-CP-IMEC-EX',   10.00, 'activo', NOW(), NOW()),
(25, 'blackboard', '2601-AT-MED-BB',    50.00, 'activo', NOW(), NOW()),
(25, 'continua',   '2601-AT-MED-CONT',  20.00, 'activo', NOW(), NOW()),
(25, 'examen',     '2601-AT-MED-EX',    30.00, 'activo', NOW(), NOW()),
(26, 'blackboard', '2601-MED-IY-BB',    50.00, 'activo', NOW(), NOW()),
(26, 'continua',   '2601-MED-IY-CONT',  40.00, 'activo', NOW(), NOW()),
(26, 'examen',     '2601-MED-IY-EX',    10.00, 'activo', NOW(), NOW()),
(27, 'blackboard', '2601-CM-NUTRI-BB',  50.00, 'activo', NOW(), NOW()),
(27, 'continua',   '2601-CM-NUTRI-CONT',20.00, 'activo', NOW(), NOW()),
(27, 'examen',     '2601-CM-NUTRI-EX',  30.00, 'activo', NOW(), NOW()),
(28, 'blackboard', '2601-EJ-NUTRI-BB',  50.00, 'activo', NOW(), NOW()),
(28, 'continua',   '2601-EJ-NUTRI-CONT',40.00, 'activo', NOW(), NOW()),
(28, 'examen',     '2601-EJ-NUTRI-EX',  10.00, 'activo', NOW(), NOW()),
(29, 'blackboard', '2601-TC-TC-BB',     50.00, 'activo', NOW(), NOW()),
(29, 'continua',   '2601-TC-TC-CONT',   20.00, 'activo', NOW(), NOW()),
(29, 'examen',     '2601-TC-TC-EX',     30.00, 'activo', NOW(), NOW()),
(30, 'blackboard', '2601-TC-TC-BB-02',  50.00, 'activo', NOW(), NOW()),
(30, 'continua',   '2601-TC-TC-CONT-02',40.00, 'activo', NOW(), NOW()),
(30, 'examen',     '2601-TC-TC-EX-02',  10.00, 'activo', NOW(), NOW());

-- =========================================================
--  12) INSCRIPCION (UNA POR SECCION)
-- =========================================================
CREATE TABLE inscripcion (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    seccion_id    INT UNSIGNED NOT NULL,
    estudiante_id INT UNSIGNED NOT NULL, -- usuario con rol estudiante
    estado        ENUM('inscrito','baja') NOT NULL DEFAULT 'inscrito',
    metodo        ENUM('presencial','linea') NOT NULL DEFAULT 'presencial',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_inscripcion (seccion_id, estudiante_id),
    KEY ix_insc_seccion_id (seccion_id),
    KEY ix_insc_estudiante_id (estudiante_id),
    CONSTRAINT fk_insc_seccion
        FOREIGN KEY (seccion_id)
        REFERENCES seccion (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_insc_estudiante
        FOREIGN KEY (estudiante_id)
        REFERENCES usuario (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  12.1 INSCRIPCIONES
-- -------------------------
INSERT INTO inscripcion
(id, seccion_id, estudiante_id, estado, metodo, created_at, updated_at)
VALUES
-- 2025-C1
(1,  1, 6,  'inscrito', 'presencial',NOW(), NOW()),
(2,  1, 7,  'inscrito', 'presencial',NOW(), NOW()),
(3,  2, 6,  'inscrito', 'presencial',NOW(), NOW()),
(4,  2, 7,  'inscrito', 'presencial',NOW(), NOW()),
(5,  3, 8,  'inscrito', 'presencial',NOW(), NOW()),
(6,  3, 9,  'inscrito', 'presencial',NOW(), NOW()),
(7,  4, 8,  'inscrito', 'presencial',NOW(), NOW()),
(8,  4, 9,  'inscrito', 'presencial',NOW(), NOW()),
(9,  5, 10, 'inscrito', 'presencial',NOW(), NOW()),
(10, 5, 11, 'inscrito', 'presencial',NOW(), NOW()),
(11, 6, 10, 'inscrito', 'presencial',NOW(), NOW()),
(12, 6, 11, 'inscrito', 'presencial',NOW(), NOW()),
(13, 7, 12, 'inscrito', 'presencial',NOW(), NOW()),
(14, 7, 13, 'inscrito', 'presencial',NOW(), NOW()),
(15, 8, 12, 'inscrito', 'presencial',NOW(), NOW()),
(16, 8, 13, 'inscrito', 'presencial',NOW(), NOW()),
(17, 9, 6,  'inscrito', 'presencial',NOW(), NOW()),
(18, 9, 7,  'inscrito', 'presencial',NOW(), NOW()),
(19, 9, 8,  'inscrito', 'presencial',NOW(), NOW()),
(20, 9, 9,  'inscrito', 'presencial',NOW(), NOW()),
(21, 9, 10, 'inscrito', 'presencial',NOW(), NOW()),
(22, 9, 11, 'inscrito', 'presencial',NOW(), NOW()),
(23, 9, 12, 'inscrito', 'presencial',NOW(), NOW()),
(24, 9, 13, 'inscrito', 'presencial',NOW(), NOW()),
(25, 10, 6, 'inscrito', 'presencial',NOW(), NOW()),
(26, 10, 7, 'inscrito', 'presencial',NOW(), NOW()),
(27, 10, 8, 'inscrito', 'presencial',NOW(), NOW()),
(28, 10, 9, 'inscrito', 'presencial',NOW(), NOW()),
(29, 10, 10,'inscrito', 'presencial',NOW(), NOW()),
(30, 10, 11,'inscrito', 'presencial',NOW(), NOW()),
(31, 10, 12,'inscrito', 'presencial',NOW(), NOW()),
(32, 10, 13,'inscrito', 'presencial',NOW(), NOW()),
-- 2025-C2
(33, 11, 6,  'inscrito', 'presencial',NOW(), NOW()),
(34, 11, 7,  'inscrito', 'presencial',NOW(), NOW()),
(35, 12, 6,  'inscrito', 'presencial',NOW(), NOW()),
(36, 12, 7,  'inscrito', 'presencial',NOW(), NOW()),
(37, 13, 8,  'inscrito', 'presencial',NOW(), NOW()),
(38, 13, 9,  'inscrito', 'presencial',NOW(), NOW()),
(39, 14, 8,  'inscrito', 'presencial',NOW(), NOW()),
(40, 14, 9,  'inscrito', 'presencial',NOW(), NOW()),
(41, 15, 10, 'inscrito', 'presencial',NOW(), NOW()),
(42, 15, 11, 'inscrito', 'presencial',NOW(), NOW()),
(43, 16, 10, 'inscrito', 'presencial',NOW(), NOW()),
(44, 16, 11, 'inscrito', 'presencial',NOW(), NOW()),
(45, 17, 12, 'inscrito', 'presencial',NOW(), NOW()),
(46, 17, 13, 'inscrito', 'presencial',NOW(), NOW()),
(47, 18, 12, 'inscrito', 'presencial',NOW(), NOW()),
(48, 18, 13, 'inscrito', 'presencial',NOW(), NOW()),
(49, 19, 6,  'inscrito', 'presencial',NOW(), NOW()),
(50, 19, 7,  'inscrito', 'presencial',NOW(), NOW()),
(51, 19, 8,  'inscrito', 'presencial',NOW(), NOW()),
(52, 19, 9,  'inscrito', 'presencial',NOW(), NOW()),
(53, 19, 10, 'inscrito', 'presencial',NOW(), NOW()),
(54, 19, 11, 'inscrito', 'presencial',NOW(), NOW()),
(55, 19, 12, 'inscrito', 'presencial',NOW(), NOW()),
(56, 19, 13, 'inscrito', 'presencial',NOW(), NOW()),
(57, 20, 6,  'inscrito', 'presencial',NOW(), NOW()),
(58, 20, 7,  'inscrito', 'presencial',NOW(), NOW()),
(59, 20, 8,  'inscrito', 'presencial',NOW(), NOW()),
(60, 20, 9,  'inscrito', 'presencial',NOW(), NOW()),
(61, 20, 10, 'inscrito', 'presencial',NOW(), NOW()),
(62, 20, 11, 'inscrito', 'presencial',NOW(), NOW()),
(63, 20, 12, 'inscrito', 'presencial',NOW(), NOW()),
(64, 20, 13, 'inscrito', 'presencial',NOW(), NOW()),
-- 2026-C2
(65, 21, 6,  'inscrito', 'presencial',NOW(), NOW()),
(66, 21, 7,  'inscrito', 'presencial',NOW(), NOW()),
(67, 22, 6,  'inscrito', 'presencial',NOW(), NOW()),
(68, 22, 7,  'inscrito', 'presencial',NOW(), NOW()),
(69, 23, 8,  'inscrito', 'presencial',NOW(), NOW()),
(70, 23, 9,  'inscrito', 'presencial',NOW(), NOW()),
(71, 24, 8,  'inscrito', 'presencial',NOW(), NOW()),
(72, 24, 9,  'inscrito', 'presencial',NOW(), NOW()),
(73, 25, 10, 'inscrito', 'presencial',NOW(), NOW()),
(74, 25, 11, 'inscrito', 'presencial',NOW(), NOW()),
(75, 26, 10, 'inscrito', 'presencial',NOW(), NOW()),
(76, 26, 11, 'inscrito', 'presencial',NOW(), NOW()),
(77, 27, 12, 'inscrito', 'presencial',NOW(), NOW()),
(78, 27, 13, 'inscrito', 'presencial',NOW(), NOW()),
(79, 28, 12, 'inscrito', 'presencial',NOW(), NOW()),
(80, 28, 13, 'inscrito', 'presencial',NOW(), NOW()),
(81, 29, 6,  'inscrito', 'presencial',NOW(), NOW()),
(82, 29, 7,  'inscrito', 'presencial',NOW(), NOW()),
(83, 29, 8,  'inscrito', 'presencial',NOW(), NOW()),
(84, 29, 9,  'inscrito', 'presencial',NOW(), NOW()),
(85, 29, 10, 'inscrito', 'presencial',NOW(), NOW()),
(86, 29, 11, 'inscrito', 'presencial',NOW(), NOW()),
(87, 29, 12, 'inscrito', 'presencial',NOW(), NOW()),
(88, 29, 13, 'inscrito', 'presencial',NOW(), NOW()),
(89, 30, 6,  'inscrito', 'presencial',NOW(), NOW()),
(90, 30, 7,  'inscrito', 'presencial',NOW(), NOW()),
(91, 30, 8,  'inscrito', 'presencial',NOW(), NOW()),
(92, 30, 9,  'inscrito', 'presencial',NOW(), NOW()),
(93, 30, 10, 'inscrito', 'presencial',NOW(), NOW()),
(94, 30, 11, 'inscrito', 'presencial',NOW(), NOW()),
(95, 30, 12, 'inscrito', 'presencial',NOW(), NOW()),
(96, 30, 13, 'inscrito', 'presencial',NOW(), NOW());


-- =========================================================
--  12.1) PARCIALES + CONFIG
-- =========================================================
CREATE TABLE parcial (
    id         TINYINT UNSIGNED NOT NULL,
    nombre     VARCHAR(20) NOT NULL,
    orden      TINYINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_parcial_orden (orden)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE seccion_parcial_config (
    seccion_id    INT UNSIGNED NOT NULL,
    parcial_id    TINYINT UNSIGNED NOT NULL,
    peso_semestre DECIMAL(5,2) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (seccion_id, parcial_id),
    CONSTRAINT fk_spc_seccion
        FOREIGN KEY (seccion_id) REFERENCES seccion (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_spc_parcial
        FOREIGN KEY (parcial_id) REFERENCES parcial (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  12.1.1 PARCIALES
-- -------------------------
INSERT INTO parcial (id, nombre, orden) VALUES
(1, 'Parcial 1', 1),
(2, 'Parcial 2', 2),
(3, 'Parcial 3', 3);
-- -------------------------
--  12.1.2 CONFIG PARCIALES POR SECCION
-- -------------------------
INSERT INTO seccion_parcial_config (seccion_id, parcial_id, peso_semestre)
SELECT s.id, p.id,
       CASE p.id
           WHEN 1 THEN 16.67
           WHEN 2 THEN 16.67
           WHEN 3 THEN 16.66
       END
FROM seccion s
CROSS JOIN parcial p;

-- =========================================================
--  12.2) CALIFICACIONES
-- =========================================================
CREATE TABLE calificacion_examen_final (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    inscripcion_id INT UNSIGNED NOT NULL,
    calificacion   DECIMAL(5,2) NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_ex_final (inscripcion_id),
    CONSTRAINT fk_exfin_insc
        FOREIGN KEY (inscripcion_id) REFERENCES inscripcion (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  12.2.1 EXAMEN FINAL
-- -------------------------
INSERT INTO calificacion_examen_final
(inscripcion_id, calificacion, created_at, updated_at)
VALUES
(1,  90.00, NOW(), NOW()),
(2,  82.00, NOW(), NOW()),
(3,  72.00, NOW(), NOW()),
(4,  89.00, NOW(), NOW()),
(5,  63.00, NOW(), NOW()),
(6,  92.00, NOW(), NOW()),
(7,  45.00, NOW(), NOW()),
(8,  92.00, NOW(), NOW()),
(9,  12.00, NOW(), NOW()),
(10, 10.00, NOW(), NOW()),
(11, 92.00, NOW(), NOW()),
(12, 63.00, NOW(), NOW()),
(13, 49.00, NOW(), NOW()),
(14, 32.00, NOW(), NOW()),
(15, 93.00, NOW(), NOW()),
(16, 93.00, NOW(), NOW()),
(17, 90.00, NOW(), NOW()),
(18, 82.00, NOW(), NOW()),
(19, 72.00, NOW(), NOW()),
(20, 89.00, NOW(), NOW()),
(21, 63.00, NOW(), NOW()),
(22, 92.00, NOW(), NOW()),
(23, 45.00, NOW(), NOW()),
(24, 92.00, NOW(), NOW()),
(25, 12.00, NOW(), NOW()),
(26, 10.00, NOW(), NOW()),
(27, 92.00, NOW(), NOW()),
(28, 63.00, NOW(), NOW()),
(29, 49.00, NOW(), NOW()),
(30, 32.00, NOW(), NOW()),
(31, 90.00, NOW(), NOW()),
(32, 82.00, NOW(), NOW());

-- =========================================================
--  12.3) Actividades
-- =========================================================
CREATE TABLE actividad (
    id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
    seccion_id         INT UNSIGNED NOT NULL,
    parcial_id         TINYINT UNSIGNED NOT NULL,
    componente         ENUM('blackboard','continua') NOT NULL,
    origen             ENUM('blackboard','teams','manual') NOT NULL DEFAULT 'manual',
    nombre             VARCHAR(160) NOT NULL,
    peso_en_componente DECIMAL(5,2) NOT NULL,
    referencia_externa VARCHAR(120) NULL,
    estado             ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_act_seccion_parcial (seccion_id, parcial_id),
    UNIQUE KEY ux_act_unique (seccion_id, parcial_id, componente, nombre),
    CONSTRAINT fk_act_seccion
        FOREIGN KEY (seccion_id) REFERENCES seccion (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_act_parcial
        FOREIGN KEY (parcial_id) REFERENCES parcial (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  12.3.1 ACTIVIDADES (más secciones)
-- -------------------------
INSERT INTO actividad
(id, seccion_id, parcial_id, componente, origen, nombre, peso_en_componente, created_at, updated_at)
VALUES
(1, 1, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(2, 1, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(3, 1, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(4, 1, 1, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(5, 1, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(6, 1, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(7, 2, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(8, 2, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(9, 2, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(10,2, 1, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(11,2, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(12,2, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(13, 3, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(14, 3, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(15, 3, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(16, 3, 1, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(17, 3, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(18, 3, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(19, 4, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(20, 4, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(21, 4, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(22,4, 1, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(23,4, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(24,4, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(25, 5, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(26, 5, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(27, 5, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(28, 5, 1, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(29, 5, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(30, 5, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(31, 6, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(32, 6, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(33, 6, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(34,6, 1, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(35,6, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(36,6, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(37, 7, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(38, 7, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(39, 7, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(40, 7, 1, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(41, 7, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(42, 7, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(43,  8, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(44,  8, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(45,  8, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(46,  8, 1, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(47,  8, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(48,  8, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(49,  9, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(50,  9, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(51,  9, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(52,  9, 1, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(53,  9, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(54,  9, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(55,  10, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(56,  10, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(57,  10, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(58,  10, 1, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(59,  10, 1, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(60,  10, 1, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(61,  1, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(62,  1, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(63,  1, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(64,  1, 2, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(65,  1, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(66,  1, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(67,  2, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(68,  2, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(69,  2, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(70,  2, 2, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(71,  2, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(72,  2, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(73,  3, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(74,  3, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(75,  3, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(76,  3, 2, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(77,  3, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(78,  3, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(79,  4, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(80,  4, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(81,  4, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(82,  4, 2, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(83,  4, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(84,  4, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(85,  5, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(86,  5, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(87,  5, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(88,  5, 2, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(89,  5, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(90,  5, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(91,  6, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(92,  6, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(93,  6, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(94,  6, 2, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(95,  6, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(96,  6, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(97,  7, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(98,  7, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(99,  7, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(100, 7, 2, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(101, 7, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(102, 7, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(103, 8, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(104, 8, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(105, 8, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(106, 8, 2, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(107, 8, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(108, 8, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(109, 9, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(110, 9, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(111, 9, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(112, 9, 2, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(113, 9, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(114, 9, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(115, 10, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(116, 10, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(117, 10, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(118, 10, 2, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(119, 10, 2, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(120, 10, 2, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(121, 1, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 50.00, NOW(), NOW()),
(122, 1, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 50.00, NOW(), NOW()),
(123, 1, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 60.00, NOW(), NOW()),
(124, 1, 3, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(125, 1, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(126, 1, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(127, 2, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 40.00, NOW(), NOW()),
(128, 2, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 60.00, NOW(), NOW()),
(129, 2, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 50.00, NOW(), NOW()),
(130, 2, 3, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(131, 2, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(132, 2, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(133, 3, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 50.00, NOW(), NOW()),
(134, 3, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 50.00, NOW(), NOW()),
(135, 3, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 60.00, NOW(), NOW()),
(136, 3, 3, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(137, 3, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(138, 3, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(139, 4, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 40.00, NOW(), NOW()),
(140, 4, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 60.00, NOW(), NOW()),
(141, 4, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 50.00, NOW(), NOW()),
(142, 4, 3, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(143, 4, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(144, 4, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(145, 5, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 50.00, NOW(), NOW()),
(146, 5, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 50.00, NOW(), NOW()),
(147, 5, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 60.00, NOW(), NOW()),
(148, 5, 3, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(149, 5, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(150, 5, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(151, 6, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 40.00, NOW(), NOW()),
(152, 6, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 60.00, NOW(), NOW()),
(153, 6, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 50.00, NOW(), NOW()),
(154, 6, 3, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(155, 6, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(156, 6, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(157, 7, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 50.00, NOW(), NOW()),
(158, 7, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 50.00, NOW(), NOW()),
(159, 7, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 60.00, NOW(), NOW()),
(160, 7, 3, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(161, 7, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(162, 7, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(163, 8, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 40.00, NOW(), NOW()),
(164, 8, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 60.00, NOW(), NOW()),
(165, 8, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 50.00, NOW(), NOW()),
(166, 8, 3, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(167, 8, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(168, 8, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(169, 9, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 50.00, NOW(), NOW()),
(170, 9, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 50.00, NOW(), NOW()),
(171, 9, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 60.00, NOW(), NOW()),
(172, 9, 3, 'continua',   'teams',      'Teams Actividad 1',    40.00, NOW(), NOW()),
(173, 9, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(174, 9, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(175, 10, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 1', 40.00, NOW(), NOW()),
(176, 10, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 2', 60.00, NOW(), NOW()),
(177, 10, 3, 'blackboard', 'blackboard', 'BB Parcial 3 Tarea 3', 50.00, NOW(), NOW()),
(178, 10, 3, 'continua',   'teams',      'Teams Actividad 1',    50.00, NOW(), NOW()),
(179, 10, 3, 'continua',   'teams',      'Teams Actividad 2',    100.00, NOW(), NOW()),
(180, 10, 3, 'continua',   'teams',      'Teams Actividad 3',    100.00, NOW(), NOW()),

(181, 11, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(182, 11, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(183, 11, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(184, 11, 1, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(185, 11, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(186, 11, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(187, 12, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(188, 12, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(189, 12, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(190, 12, 1, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(191, 12, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(192, 12, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(193, 13, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(194, 13, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(195, 13, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(196, 13, 1, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(197, 13, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(198, 13, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(199, 14, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(200, 14, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(201, 14, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(202, 14, 1, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(203, 14, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(204, 14, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(205, 15, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(206, 15, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(207, 15, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(208, 15, 1, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(209, 15, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(210, 15, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(211, 16, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(212, 16, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(213, 16, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(214, 16, 1, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(215, 16, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(216, 16, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(217, 17, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(218, 17, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(219, 17, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(220, 17, 1, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(221, 17, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(222, 17, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(223, 18, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(224, 18, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(225, 18, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(226, 18, 1, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(227, 18, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(228, 18, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(229, 19, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 50.00, NOW(), NOW()),
(230, 19, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 50.00, NOW(), NOW()),
(231, 19, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 60.00, NOW(), NOW()),
(232, 19, 1, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(233, 19, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(234, 19, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(235, 20, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 1', 40.00, NOW(), NOW()),
(236, 20, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 2', 60.00, NOW(), NOW()),
(237, 20, 1, 'blackboard', 'blackboard', 'BB Parcial 1 Tarea 3', 50.00, NOW(), NOW()),
(238, 20, 1, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(239, 20, 1, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(240, 20, 1, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(241, 11, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(242, 11, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(243, 11, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(244, 11, 2, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(245, 11, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(246, 11, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(247, 12, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(248, 12, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(249, 12, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(250, 12, 2, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(251, 12, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(252, 12, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(253, 13, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(254, 13, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(255, 13, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(256, 13, 2, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(257, 13, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(258, 13, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(259, 14, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(260, 14, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(261, 14, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(262, 14, 2, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(263, 14, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(264, 14, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(265, 15, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(266, 15, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(267, 15, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(268, 15, 2, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(269, 15, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(270, 15, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(271, 16, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(272, 16, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(273, 16, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(274, 16, 2, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(275, 16, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(276, 16, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(277, 17, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(278, 17, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(279, 17, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(280, 17, 2, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(281, 17, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(282, 17, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(283, 18, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(284, 18, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(285, 18, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(286, 18, 2, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(287, 18, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(288, 18, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(289, 19, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 50.00, NOW(), NOW()),
(290, 19, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 50.00, NOW(), NOW()),
(291, 19, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 60.00, NOW(), NOW()),
(292, 19, 2, 'continua',   'teams',      'Teams Actividad 1', 40.00, NOW(), NOW()),
(293, 19, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(294, 19, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW()),

(295, 20, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 1', 40.00, NOW(), NOW()),
(296, 20, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 2', 60.00, NOW(), NOW()),
(297, 20, 2, 'blackboard', 'blackboard', 'BB Parcial 2 Tarea 3', 50.00, NOW(), NOW()),
(298, 20, 2, 'continua',   'teams',      'Teams Actividad 1', 50.00, NOW(), NOW()),
(299, 20, 2, 'continua',   'teams',      'Teams Actividad 2', 100.00, NOW(), NOW()),
(300, 20, 2, 'continua',   'teams',      'Teams Actividad 3', 100.00, NOW(), NOW());

-- =========================================================
--  12.4) Calificacion Actividades
-- =========================================================
CREATE TABLE calificacion_actividad (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    actividad_id   INT UNSIGNED NOT NULL,
    inscripcion_id INT UNSIGNED NOT NULL,
    calificacion   DECIMAL(5,2) NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_cal_act (actividad_id, inscripcion_id),
    KEY ix_cal_insc (inscripcion_id),
    CONSTRAINT fk_cal_act_actividad
        FOREIGN KEY (actividad_id) REFERENCES actividad (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cal_act_insc
        FOREIGN KEY (inscripcion_id) REFERENCES inscripcion (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  12.4.1 CALIFICACION ACTIVIDAD
-- -------------------------
INSERT INTO calificacion_actividad
(actividad_id, inscripcion_id, calificacion, created_at, updated_at)
SELECT
    a.id AS actividad_id,
    i.id AS inscripcion_id,
    CASE
        WHEN MOD(CRC32(CONCAT('miss-', a.id, '-', i.id)), 23) = 0 THEN NULL
        ELSE ROUND(
            LEAST(100, GREATEST(0,
                (CASE a.componente
                    WHEN 'blackboard' THEN 72
                    ELSE 68
                 END)
                + (CAST(MOD(CRC32(CONCAT('v-', a.id, '-', i.id)), 31) AS SIGNED) - 8)   -- variación [-8..22]
                - (CASE WHEN MOD(CRC32(CONCAT('low-', i.id, '-', a.seccion_id)), 17) = 0 THEN 18 ELSE 0 END)
            ))
        , 2)
    END AS calificacion,
    NOW(),
    NOW()
FROM actividad a
JOIN inscripcion i
  ON i.seccion_id = a.seccion_id
 AND i.estado = 'inscrito'
WHERE a.estado = 'activa'
  AND a.seccion_id BETWEEN 1 AND 20;

CREATE TABLE calificacion_examen_parcial (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    inscripcion_id INT UNSIGNED NOT NULL,
    parcial_id     TINYINT UNSIGNED NOT NULL,
    calificacion   DECIMAL(5,2) NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_ex_parcial (inscripcion_id, parcial_id),
    CONSTRAINT fk_expar_insc
        FOREIGN KEY (inscripcion_id) REFERENCES inscripcion (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_expar_parcial
        FOREIGN KEY (parcial_id) REFERENCES parcial (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- -------------------------
--  12.4.2 CALIFICACION EXAMEN PARCIAL
-- -------------------------
INSERT INTO calificacion_examen_parcial
(inscripcion_id, parcial_id, calificacion, created_at, updated_at)
SELECT
    i.id AS inscripcion_id,
    p.id AS parcial_id,
    CASE
        -- algunos "no presentó"
        WHEN MOD(CRC32(CONCAT('miss-ex-', i.id, '-', p.id)), 19) = 0 THEN NULL
        ELSE ROUND(
            LEAST(100, GREATEST(0,
                (CASE p.id
                    WHEN 1 THEN 74
                    WHEN 2 THEN 70
                    ELSE 76
                 END)
                + (MOD(CRC32(CONCAT('ex-', i.id, '-', p.id)), 27))       -- variación [0..26]
                - (CASE WHEN MOD(CRC32(CONCAT('pen-', i.id)), 11) = 0 THEN 22 ELSE 0 END)
            ))
        , 2)
    END AS calificacion,
    NOW(),
    NOW()
FROM inscripcion i
JOIN parcial p ON p.id IN (1,2,3)
WHERE i.estado = 'inscrito'
  AND (
        (i.seccion_id BETWEEN 1  AND 10 AND p.id IN (1,2,3))
     OR (i.seccion_id BETWEEN 11 AND 20 AND p.id IN (1,2))
  );

-- =========================================================
--  13) VISTAS ÚTILES (IGUALES A TU LÓGICA)
-- =========================================================

CREATE OR REPLACE VIEW vw_inscripcion_con_crn AS
SELECT
    i.id AS inscripcion_id,
    i.estudiante_id,
    u.nombre_completo AS estudiante_nombre,
    u.correo AS estudiante_correo,
    u.matricula AS estudiante_matricula,

    s.id AS seccion_id,
    m.codigo_materia,
    m.nombre_materia,
    c.codigo_carrera,
    c.nombre_carrera,
    p.codigo AS periodo,
    s.grupo,
    s.modalidad,
    s.docente_id,

    sc.tipo AS componente_tipo,
    sc.crn  AS componente_crn
FROM inscripcion i
JOIN usuario u ON u.id = i.estudiante_id
JOIN seccion s ON s.id = i.seccion_id
JOIN materia m ON m.id = s.materia_id
JOIN carrera c ON c.id = s.carrera_id
JOIN periodo p ON p.id = s.periodo_id
JOIN seccion_componente sc ON sc.seccion_id = s.id;

CREATE OR REPLACE VIEW vw_oferta_periodo AS
SELECT
    p.codigo AS periodo,
    s.id AS seccion_id,
    m.codigo_materia,
    m.nombre_materia,
    c.codigo_carrera,
    s.grupo,
    s.modalidad,
    s.estado,
    MAX(CASE WHEN sc.tipo='continua'   THEN sc.crn END) AS crn_continua,
    MAX(CASE WHEN sc.tipo='blackboard' THEN sc.crn END) AS crn_blackboard,
    MAX(CASE WHEN sc.tipo='examen'     THEN sc.crn END) AS crn_examen
FROM seccion s
JOIN periodo p ON p.id = s.periodo_id
JOIN materia m ON m.id = s.materia_id
JOIN carrera c ON c.id = s.carrera_id
LEFT JOIN seccion_componente sc ON sc.seccion_id = s.id
GROUP BY p.codigo, s.id, m.codigo_materia, m.nombre_materia, c.codigo_carrera, s.grupo, s.modalidad, s.estado;

CREATE OR REPLACE VIEW vw_componente_parcial_alumno AS
SELECT
    i.id AS inscripcion_id,
    a.seccion_id,
    a.parcial_id,
    a.componente,
    ROUND(SUM(COALESCE(ca.calificacion, 0) * a.peso_en_componente) / 100, 2) AS calificacion_componente
FROM actividad a
JOIN inscripcion i ON i.seccion_id = a.seccion_id AND i.estado='inscrito'
LEFT JOIN calificacion_actividad ca
       ON ca.actividad_id = a.id AND ca.inscripcion_id = i.id
WHERE a.estado='activa'
GROUP BY i.id, a.seccion_id, a.parcial_id, a.componente;

CREATE OR REPLACE VIEW vw_final_parcial_alumno AS
SELECT
    i.id AS inscripcion_id,
    s.id AS seccion_id,
    p.id AS parcial_id,

    MAX(CASE WHEN v.componente='blackboard' THEN v.calificacion_componente END) AS bb_calc,
    MAX(CASE WHEN v.componente='continua'   THEN v.calificacion_componente END) AS ec_calc,
    ep.calificacion AS ex_parcial,

    MAX(CASE WHEN sc.tipo='blackboard' THEN sc.peso_porcentaje END) AS peso_bb,
    MAX(CASE WHEN sc.tipo='continua'   THEN sc.peso_porcentaje END) AS peso_ec,
    MAX(CASE WHEN sc.tipo='examen'     THEN sc.peso_porcentaje END) AS peso_ex,

    ROUND(
        (
            COALESCE(MAX(CASE WHEN v.componente='blackboard' THEN v.calificacion_componente END), 0)
            * COALESCE(MAX(CASE WHEN sc.tipo='blackboard' THEN sc.peso_porcentaje END), 0)
            +
            COALESCE(MAX(CASE WHEN v.componente='continua' THEN v.calificacion_componente END), 0)
            * COALESCE(MAX(CASE WHEN sc.tipo='continua' THEN sc.peso_porcentaje END), 0)
            +
            COALESCE(ep.calificacion, 0)
            * COALESCE(MAX(CASE WHEN sc.tipo='examen' THEN sc.peso_porcentaje END), 0)
        ) / 100
    , 2) AS final_parcial
FROM inscripcion i
JOIN seccion s ON s.id = i.seccion_id
JOIN parcial p ON p.id IN (1,2,3)
LEFT JOIN vw_componente_parcial_alumno v
       ON v.inscripcion_id = i.id AND v.parcial_id = p.id
LEFT JOIN calificacion_examen_parcial ep
       ON ep.inscripcion_id = i.id AND ep.parcial_id = p.id
LEFT JOIN seccion_componente sc
       ON sc.seccion_id = s.id AND sc.estado='activo'
WHERE i.estado='inscrito'
GROUP BY i.id, s.id, p.id, ep.calificacion;

CREATE OR REPLACE VIEW vw_docente_clases_alumnos AS
SELECT
    s.docente_id,

    s.id AS seccion_id,
    s.grupo,
    s.modalidad,
    s.estado AS seccion_estado,

    p.id AS periodo_id,
    p.codigo AS periodo_codigo,

    c.id AS carrera_id,
    c.codigo_carrera,
    c.nombre_carrera,

    m.id AS materia_id,
    m.codigo_materia,
    m.nombre_materia,
    m.tipo_evaluacion,

    MAX(CASE WHEN sc.tipo = 'continua'   THEN sc.crn END) AS crn_continua,
    MAX(CASE WHEN sc.tipo = 'blackboard' THEN sc.crn END) AS crn_blackboard,
    MAX(CASE WHEN sc.tipo = 'examen'     THEN sc.crn END) AS crn_examen,

    MAX(CASE WHEN sc.tipo = 'continua'   THEN sc.peso_porcentaje END) AS peso_continua_db,
    MAX(CASE WHEN sc.tipo = 'blackboard' THEN sc.peso_porcentaje END) AS peso_blackboard_db,
    MAX(CASE WHEN sc.tipo = 'examen'     THEN sc.peso_porcentaje END) AS peso_examen_db,

    i.id AS inscripcion_id,
    i.estado AS inscripcion_estado,

    u.id AS estudiante_id,
    u.nombre_completo AS estudiante_nombre,
    u.matricula AS estudiante_matricula,
    u.correo AS estudiante_correo,

    MAX(fp.bb_calc)       AS bb_calc,
    MAX(fp.ec_calc)       AS ec_calc,
    MAX(fp.ex_parcial)    AS ex_parcial,
    MAX(fp.final_parcial) AS final_parcial
FROM seccion s
JOIN periodo p ON p.id = s.periodo_id
JOIN carrera c ON c.id = s.carrera_id
JOIN materia m ON m.id = s.materia_id
LEFT JOIN seccion_componente sc
       ON sc.seccion_id = s.id AND sc.estado='activo'
LEFT JOIN inscripcion i
       ON i.seccion_id = s.id AND i.estado='inscrito'
LEFT JOIN usuario u
       ON u.id = i.estudiante_id
LEFT JOIN vw_final_parcial_alumno fp
       ON fp.inscripcion_id = i.id
      AND fp.parcial_id = 1
GROUP BY
    s.docente_id,
    s.id, s.grupo, s.modalidad, s.estado,
    p.id, p.codigo,
    c.id, c.codigo_carrera, c.nombre_carrera,
    m.id, m.codigo_materia, m.nombre_materia, m.tipo_evaluacion,
    i.id, i.estado,
    u.id, u.nombre_completo, u.matricula, u.correo;

CREATE OR REPLACE VIEW vw_final_semestre_alumno AS
SELECT
    i.id AS inscripcion_id,
    s.id AS seccion_id,

    ROUND(
        SUM(COALESCE(fp.final_parcial, 0) * spc.peso_semestre) / 100
        +
        COALESCE(ef.calificacion, 0) * 0.50
    , 2) AS final_semestre
FROM inscripcion i
JOIN seccion s ON s.id = i.seccion_id
LEFT JOIN seccion_parcial_config spc
       ON spc.seccion_id = s.id
LEFT JOIN vw_final_parcial_alumno fp
       ON fp.inscripcion_id = i.id
      AND fp.parcial_id = spc.parcial_id
LEFT JOIN calificacion_examen_final ef
       ON ef.inscripcion_id = i.id
WHERE i.estado='inscrito'
GROUP BY i.id, s.id, ef.calificacion;


-- =========================================================
--  ===================== QBANK / EXAMENES ==================
--  (SE AGREGA AL FINAL. NO MODIFICA TUS DUMMIES EXISTENTES)
-- =========================================================

-- =========================================================
--  QBANK 0) DOCENTE TC POR AREA (1 TC por área)
-- =========================================================
CREATE TABLE area_docente_tc (
    area_id    INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (area_id),
    UNIQUE KEY ux_adtc_usuario (usuario_id),
    CONSTRAINT fk_adtc_area FOREIGN KEY (area_id) REFERENCES area (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_adtc_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dummy extra: TC para Salud (no toca tus dummies actuales)
INSERT INTO usuario
(id, rol_id, nombre_completo, correo, matricula, password_hash, estado, created_at, updated_at)
VALUES
(14, 3, 'Docente TC Salud Arturo', 'tc.salud@uvm.edu', 100136757,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW());

INSERT INTO docente_profile (usuario_id, categoria, created_at, updated_at) VALUES
(14, 'tiempo_completo', NOW(), NOW());

INSERT INTO area_docente_tc (area_id, usuario_id, created_at, updated_at) VALUES
(1, 4,  NOW(), NOW()),
(2, 14, NOW(), NOW());

-- =========================================================
--  QBANK 0.1) MATERIA_AREA (materias compartidas por áreas)
-- =========================================================
CREATE TABLE materia_area (
    materia_id        INT UNSIGNED NOT NULL,
    area_id           INT UNSIGNED NOT NULL,
    es_estandarizable TINYINT(1)   NOT NULL DEFAULT 1,
    estado            ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (materia_id, area_id),
    KEY ix_ma_area (area_id),
    CONSTRAINT fk_ma_materia FOREIGN KEY (materia_id) REFERENCES materia (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ma_area FOREIGN KEY (area_id) REFERENCES area (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dummies: Ingeniería(1) = materias 1..4, Salud(2) = materias 5..8, Tronco común(9) = ambas
-- es_estandarizable: 1 = sí se puede estandarizar; 0 = no (por naturaleza ambigua)
INSERT INTO materia_area (materia_id, area_id, es_estandarizable, estado, created_at, updated_at) VALUES
(1, 1, 1, 'activa', NOW(), NOW()),
(2, 1, 1, 'activa', NOW(), NOW()),
(3, 1, 1, 'activa', NOW(), NOW()),
(4, 1, 1, 'activa', NOW(), NOW()),

(5, 2, 1, 'activa', NOW(), NOW()),
(6, 2, 1, 'activa', NOW(), NOW()),
(7, 2, 0, 'activa', NOW(), NOW()),
(8, 2, 0, 'activa', NOW(), NOW()),

(9, 1, 1, 'activa', NOW(), NOW()),
(9, 2, 1, 'activa', NOW(), NOW());

-- =========================================================
--  QBANK 1) TEMA (por materia y opcionalmente por parcial)
-- =========================================================
CREATE TABLE tema (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    materia_id INT UNSIGNED NOT NULL,
    parcial_id TINYINT UNSIGNED NULL,
    nombre     VARCHAR(120) NOT NULL,
    estado     ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_tema (materia_id, parcial_id, nombre),
    KEY ix_tema_materia_parcial (materia_id, parcial_id),
    CONSTRAINT fk_tema_materia FOREIGN KEY (materia_id) REFERENCES materia (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_tema_parcial FOREIGN KEY (parcial_id) REFERENCES parcial (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tema (id, materia_id, parcial_id, nombre, estado, created_at, updated_at) VALUES
(1, 2, 1, 'Fundamentos',        'activo', NOW(), NOW()),
(2, 2, 1, 'Estructuras de control', 'activo', NOW(), NOW()),
(3, 2, 2, 'Funciones',          'activo', NOW(), NOW()),
(4, 2, 3, 'POO',                'activo', NOW(), NOW()),
(5, 6, 1, 'Técnica básica',     'activo', NOW(), NOW()),
(6, 6, 2, 'Materiales',         'activo', NOW(), NOW()),
(7, 9, 1, 'Tronco común - básico','activo', NOW(), NOW());

-- =========================================================
--  QBANK 2) BANCO DE PREGUNTAS (base + versiones)
-- =========================================================
CREATE TABLE pregunta (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    materia_id             INT UNSIGNED NOT NULL,
    creada_por_usuario_id  INT UNSIGNED NOT NULL,
    estado                 ENUM('pendiente','revision','aprobada','rechazada','archivada') NOT NULL DEFAULT 'pendiente',
    version_actual_id      BIGINT UNSIGNED NULL,
    created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_preg_materia_estado (materia_id, estado),
    CONSTRAINT fk_preg_materia FOREIGN KEY (materia_id) REFERENCES materia (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_preg_creador FOREIGN KEY (creada_por_usuario_id) REFERENCES usuario (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pregunta_version (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pregunta_id   BIGINT UNSIGNED NOT NULL,
    version_num   INT UNSIGNED NOT NULL,
    tipo          ENUM(
        'opcion_multiple','verdadero_falso','abierta','relacionar',
        'ordenar','completar','numerica'
    ) NOT NULL,
    enunciado     LONGTEXT NOT NULL,

    dificultad    TINYINT UNSIGNED NOT NULL, -- 1..10
    scope         ENUM('parcial','final') NOT NULL DEFAULT 'parcial',
    parcial_id    TINYINT UNSIGNED NULL,

    contenido_json LONGTEXT NOT NULL,
    respuesta_json LONGTEXT NOT NULL,

    estado        ENUM('pendiente','revision','aprobada','rechazada','archivada') NOT NULL DEFAULT 'pendiente',

    created_by    INT UNSIGNED NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY ux_pv (pregunta_id, version_num),
    KEY ix_pv_filtro (tipo, dificultad, scope, parcial_id),
    CONSTRAINT fk_pv_preg FOREIGN KEY (pregunta_id) REFERENCES pregunta (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pv_parcial FOREIGN KEY (parcial_id) REFERENCES parcial (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_pv_created_by FOREIGN KEY (created_by) REFERENCES usuario (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FK opcional para mantener coherencia entre pregunta.version_actual_id y pregunta_version.id
ALTER TABLE pregunta
    ADD CONSTRAINT fk_preg_version_actual
    FOREIGN KEY (version_actual_id) REFERENCES pregunta_version (id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE pregunta_version_tema (
    pregunta_version_id BIGINT UNSIGNED NOT NULL,
    tema_id             INT UNSIGNED NOT NULL,
    PRIMARY KEY (pregunta_version_id, tema_id),
    KEY ix_pvt_tema (tema_id),
    CONSTRAINT fk_pvt_pv FOREIGN KEY (pregunta_version_id) REFERENCES pregunta_version (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pvt_tema FOREIGN KEY (tema_id) REFERENCES tema (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pregunta_version_area (
    pregunta_version_id BIGINT UNSIGNED NOT NULL,
    area_id             INT UNSIGNED NOT NULL,
    PRIMARY KEY (pregunta_version_id, area_id),
    KEY ix_pva_area (area_id),
    CONSTRAINT fk_pva_pv FOREIGN KEY (pregunta_version_id) REFERENCES pregunta_version (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pva_area FOREIGN KEY (area_id) REFERENCES area (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pregunta_voto (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pregunta_version_id BIGINT UNSIGNED NOT NULL,
    area_id             INT UNSIGNED NULL,
    votante_id          INT UNSIGNED NOT NULL,
    decision            ENUM('aprobar','rechazar','revision') NOT NULL,
    comentario          TEXT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_voto_unico (pregunta_version_id, votante_id),
    KEY ix_voto_pv_area_dec (pregunta_version_id, area_id, decision),
    CONSTRAINT fk_pvoto_pv FOREIGN KEY (pregunta_version_id) REFERENCES pregunta_version (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pvoto_area FOREIGN KEY (area_id) REFERENCES area (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_pvoto_votante FOREIGN KEY (votante_id) REFERENCES usuario (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------
--  QBANK 2.x DUMMIES PREGUNTAS + VERSIONES
-- -------------------------

-- Preguntas base
INSERT INTO pregunta (id, materia_id, creada_por_usuario_id, estado, version_actual_id, created_at, updated_at) VALUES
(1, 2, 4, 'aprobada', NULL, NOW(), NOW()), -- Programación I (docente_tc)
(2, 2, 2, 'aprobada', NULL, NOW(), NOW()), -- Programación I (coordinador ing)
(3, 2, 1, 'aprobada', NULL, NOW(), NOW()), -- Programación I (admin)
(4, 6, 5, 'aprobada', NULL, NOW(), NOW()), -- Inyecciones (docente_general)
(5, 6, 3, 'aprobada', NULL, NOW(), NOW()), -- Inyecciones (coordinador salud)
(6, 9, 2, 'aprobada', NULL, NOW(), NOW()), -- Tronco común (coordinador ing)
(7, 2, 4, 'revision', NULL, NOW(), NOW()); -- Programación I (en revisión)

-- Versiones (1 de cada tipo mínimo)
INSERT INTO pregunta_version
(id, pregunta_id, version_num, tipo, enunciado, dificultad, scope, parcial_id, contenido_json, respuesta_json, estado, created_by, created_at, updated_at)
VALUES
(1, 1, 1, 'opcion_multiple',
 '¿Cuál palabra clave declara una constante en JavaScript?',
 3, 'parcial', 1,
 '{"opciones":["const","let","var","static"],"multiple":false}',
 '{"correcta":[0]}',
 'aprobada', 4, NOW(), NOW()),

(2, 2, 1, 'verdadero_falso',
 'En JavaScript, el operador "==" compara también el tipo de dato.',
 2, 'parcial', 1,
 '{"enunciado_corto":"Comparación de igualdad"}',
 '{"correcta":false}',
 'aprobada', 2, NOW(), NOW()),

(3, 3, 1, 'completar',
 'Completa el espacio: for (let i = 0; i < ___; i++) { ... }',
 2, 'parcial', 1,
 '{"blanks":[{"id":1,"placeholder":"___","tipo":"texto"}]}',
 '{"blanks":[{"id":1,"valor":"n"}]}',
 'aprobada', 1, NOW(), NOW()),

(4, 4, 1, 'relacionar',
 'Relaciona el material con su uso.',
 5, 'parcial', 1,
 '{"pares":[{"izq":"Jeringa","der":["Aplicación intramuscular","Aplicación intravenosa","Toma de muestra"]},{"izq":"Guantes","der":["Protección","Medición","Incisión"]},{"izq":"Algodón","der":["Limpieza","Sutura","Diagnóstico"]}]}',
 '{"correctas":[{"izq":"Jeringa","der":"Aplicación intramuscular"},{"izq":"Guantes","der":"Protección"},{"izq":"Algodón","der":"Limpieza"}]}',
 'aprobada', 5, NOW(), NOW()),

(5, 5, 1, 'ordenar',
 'Ordena los pasos básicos para aplicar una inyección (de forma general).',
 6, 'parcial', 1,
 '{"items":["Higienizar manos","Preparar material","Desinfectar zona","Aplicar inyección","Desechar material"]}',
 '{"orden":[0,1,2,3,4]}',
 'aprobada', 3, NOW(), NOW()),

(6, 6, 1, 'numerica',
 'Si en un examen sacas 80 y vale 30% del componente, ¿cuánto aporta al componente (en puntos porcentuales)?',
 4, 'parcial', 1,
 '{"unidad":"puntos_porcentuales"}',
 '{"valor":24.0,"tolerancia":0.5}',
 'aprobada', 2, NOW(), NOW()),

(7, 7, 1, 'abierta',
 'Explica con tus palabras qué es una variable y da un ejemplo.',
 3, 'parcial', 1,
 '{"rubrica":["Define variable","Da ejemplo válido"],"keywords":["valor","memoria","almacenar","let","const","var"]}',
 '{"keywords":["valor","memoria","almacenar"],"min_hits":1}',
 'revision', 4, NOW(), NOW()),

-- version 2 (ejemplo de versionado)
(8, 1, 2, 'opcion_multiple',
 '¿Cuál palabra clave declara una constante en JavaScript? (versión mejorada)',
 3, 'parcial', 1,
 '{"opciones":["const","let","var"],"multiple":false}',
 '{"correcta":[0]}',
 'aprobada', 4, NOW(), NOW());

-- Version actual por pregunta (apunta a la última vigente)
UPDATE pregunta SET version_actual_id = 8 WHERE id = 1;
UPDATE pregunta SET version_actual_id = 2 WHERE id = 2;
UPDATE pregunta SET version_actual_id = 3 WHERE id = 3;
UPDATE pregunta SET version_actual_id = 4 WHERE id = 4;
UPDATE pregunta SET version_actual_id = 5 WHERE id = 5;
UPDATE pregunta SET version_actual_id = 6 WHERE id = 6;
UPDATE pregunta SET version_actual_id = 7 WHERE id = 7;

-- Relación versiones ↔ temas
INSERT INTO pregunta_version_tema (pregunta_version_id, tema_id) VALUES
(8, 1), -- q1 v2 -> Fundamentos
(2, 2), -- vf -> Estructuras control
(3, 2), -- completar -> Estructuras control
(4, 5), -- relacionar -> Técnica básica
(5, 5), -- ordenar -> Técnica básica
(6, 7), -- numérica -> tronco común
(7, 1); -- abierta -> Fundamentos

-- Relación versiones ↔ áreas (congela el alcance por auditoría)
INSERT INTO pregunta_version_area (pregunta_version_id, area_id) VALUES
(1, 1), (8, 1), (2, 1), (3, 1), (7, 1),
(4, 2), (5, 2),
(6, 1), (6, 2);

-- Votos (aprobación / revisión)
-- Aprobación normal: Coordinador (área 1) + TC (área 1)
INSERT INTO pregunta_voto (pregunta_version_id, area_id, votante_id, decision, comentario, created_at, updated_at) VALUES
(8, 1, 2, 'aprobar', 'Correcta y clara.', NOW(), NOW()),
(8, 1, 4, 'aprobar', 'Aprobada para parcial 1.', NOW(), NOW()),

-- Aprobación Salud: Coordinador (área 2) + TC (área 2)
(4, 2, 3,  'aprobar', 'Alineada a técnica básica.', NOW(), NOW()),
(4, 2, 14, 'aprobar', 'Lista para banco estandarizado.', NOW(), NOW()),

-- Caso multi-área: dos coordinadores
(6, 1, 2, 'aprobar', 'Aprobación por coordinación Ing.', NOW(), NOW()),
(6, 2, 3, 'aprobar', 'Aprobación por coordinación Salud.', NOW(), NOW()),

-- En revisión (comentario obligatorio)
(7, 1, 2, 'revision', 'Buena idea, pero pide un ejemplo más específico.', NOW(), NOW());

-- =========================================================
--  QBANK 3) EXAMENES POR SECCION + INTENTOS + RESPUESTAS
-- =========================================================
CREATE TABLE examen (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    seccion_id        INT UNSIGNED NOT NULL,
    materia_id        INT UNSIGNED NOT NULL,
    creado_por        INT UNSIGNED NOT NULL,

    tipo              ENUM('parcial','final') NOT NULL,
    parcial_id        TINYINT UNSIGNED NULL,

    fecha_inicio      DATETIME NOT NULL,
    duracion_min      SMALLINT UNSIGNED NOT NULL,
    intentos_max      TINYINT UNSIGNED NOT NULL DEFAULT 1,

    modo_armado       ENUM('manual','random') NOT NULL DEFAULT 'random',
    num_preguntas     SMALLINT UNSIGNED NOT NULL,
    dificultad_min    TINYINT UNSIGNED NOT NULL DEFAULT 1,
    dificultad_max    TINYINT UNSIGNED NOT NULL DEFAULT 10,

    mezclar_preguntas TINYINT(1) NOT NULL DEFAULT 1,
    mezclar_opciones  TINYINT(1) NOT NULL DEFAULT 1,

    estado            ENUM('borrador','programado','activo','cerrado','archivado') NOT NULL DEFAULT 'borrador',

    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY ix_examen_seccion (seccion_id, tipo, parcial_id, estado),
    CONSTRAINT fk_ex_seccion FOREIGN KEY (seccion_id) REFERENCES seccion (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ex_materia FOREIGN KEY (materia_id) REFERENCES materia (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_ex_creado_por FOREIGN KEY (creado_por) REFERENCES usuario (id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_ex_parcial FOREIGN KEY (parcial_id) REFERENCES parcial (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE examen_pregunta (
    examen_id           BIGINT UNSIGNED NOT NULL,
    pregunta_version_id BIGINT UNSIGNED NOT NULL,
    puntos              DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    orden_base          SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (examen_id, pregunta_version_id),
    KEY ix_ep_orden (examen_id, orden_base),
    CONSTRAINT fk_ep_ex FOREIGN KEY (examen_id) REFERENCES examen (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ep_pv FOREIGN KEY (pregunta_version_id) REFERENCES pregunta_version (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE examen_intento (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    examen_id      BIGINT UNSIGNED NOT NULL,
    inscripcion_id INT UNSIGNED NOT NULL,
    intento_num    TINYINT UNSIGNED NOT NULL,

    inicio_real    DATETIME NULL,
    fin_real       DATETIME NULL,

    estado         ENUM('pendiente','en_progreso','enviado','revisado','anulado') NOT NULL DEFAULT 'pendiente',

    calif_auto     DECIMAL(6,2) NULL,
    calif_manual   DECIMAL(6,2) NULL,
    calif_final    DECIMAL(6,2) NULL,

    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY ux_intento (examen_id, inscripcion_id, intento_num),
    KEY ix_intento_insc (inscripcion_id),

    CONSTRAINT fk_ei_ex FOREIGN KEY (examen_id) REFERENCES examen (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ei_insc FOREIGN KEY (inscripcion_id) REFERENCES inscripcion (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE examen_intento_pregunta (
    examen_intento_id    BIGINT UNSIGNED NOT NULL,
    pregunta_version_id  BIGINT UNSIGNED NOT NULL,
    orden                SMALLINT UNSIGNED NOT NULL,
    opciones_orden_json  LONGTEXT NULL,
    PRIMARY KEY (examen_intento_id, pregunta_version_id),
    KEY ix_eip_orden (examen_intento_id, orden),
    CONSTRAINT fk_eip_ei FOREIGN KEY (examen_intento_id) REFERENCES examen_intento (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_eip_pv FOREIGN KEY (pregunta_version_id) REFERENCES pregunta_version (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE examen_respuesta (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    examen_intento_id    BIGINT UNSIGNED NOT NULL,
    pregunta_version_id  BIGINT UNSIGNED NOT NULL,

    respuesta_json       LONGTEXT NULL,
    respuesta_texto      LONGTEXT NULL,

    puntaje_auto         DECIMAL(6,2) NULL,
    puntaje_manual       DECIMAL(6,2) NULL,
    estado_revision      ENUM('pendiente','revisada') NOT NULL DEFAULT 'pendiente',
    feedback             TEXT NULL,

    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY ux_resp (examen_intento_id, pregunta_version_id),

    CONSTRAINT fk_er_ei FOREIGN KEY (examen_intento_id) REFERENCES examen_intento (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_er_pv FOREIGN KEY (pregunta_version_id) REFERENCES pregunta_version (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------
--  QBANK 3.x DUMMIES EXAMENES
-- -------------------------
-- Examen Parcial 1 para Programación I en periodo activo (sección 12, docente 4 en tus dummies)
INSERT INTO examen
(id, seccion_id, materia_id, creado_por, tipo, parcial_id, fecha_inicio, duracion_min, intentos_max,
 modo_armado, num_preguntas, dificultad_min, dificultad_max, mezclar_preguntas, mezclar_opciones, estado, created_at, updated_at)
VALUES
(1, 12, 2, 4, 'parcial', 1, '2025-11-15 10:00:00', 60, 2, 'random', 3, 1, 5, 1, 1, 'programado', NOW(), NOW());

INSERT INTO examen_pregunta (examen_id, pregunta_version_id, puntos, orden_base) VALUES
(1, 8, 1.00, 1),
(1, 2, 1.00, 2),
(1, 3, 1.00, 3);

-- Intentos para alumnos de la sección 12 (inscripciones 35 y 36 en tus dummies)
INSERT INTO examen_intento
(id, examen_id, inscripcion_id, intento_num, inicio_real, fin_real, estado, calif_auto, calif_manual, calif_final, created_at, updated_at)
VALUES
(1, 1, 35, 1, '2025-11-15 10:00:00', '2025-11-15 10:45:00', 'enviado', 2.00, NULL, NULL, NOW(), NOW()),
(2, 1, 36, 1, '2025-11-15 10:00:00', '2025-11-15 10:50:00', 'enviado', 3.00, NULL, NULL, NOW(), NOW()),
(3, 1, 35, 2, '2025-11-16 10:00:00', '2025-11-16 10:40:00', 'enviado', 3.00, NULL, NULL, NOW(), NOW());

-- Random orden por intento (y orden de opciones para la de opción múltiple)
INSERT INTO examen_intento_pregunta (examen_intento_id, pregunta_version_id, orden, opciones_orden_json) VALUES
(1, 2, 1, NULL),
(1, 3, 2, NULL),
(1, 8, 3, '{"opciones":[2,0,1]}' ),

(2, 8, 1, '{"opciones":[1,2,0]}' ),
(2, 2, 2, NULL),
(2, 3, 3, NULL),

(3, 3, 1, NULL),
(3, 8, 2, '{"opciones":[0,2,1]}' ),
(3, 2, 3, NULL);

-- Respuestas (auto + pendiente de revisión manual)
INSERT INTO examen_respuesta
(examen_intento_id, pregunta_version_id, respuesta_json, respuesta_texto, puntaje_auto, puntaje_manual, estado_revision, feedback, created_at, updated_at)
VALUES
(1, 8, '{"seleccion":[0]}', NULL, 1.00, NULL, 'pendiente', NULL, NOW(), NOW()),
(1, 2, '{"valor":false}',   NULL, 1.00, NULL, 'pendiente', NULL, NOW(), NOW()),
(1, 3, '{"blanks":[{"id":1,"valor":"n"}]}', NULL, 0.00, NULL, 'pendiente', NULL, NOW(), NOW()),

(2, 8, '{"seleccion":[0]}', NULL, 1.00, NULL, 'pendiente', NULL, NOW(), NOW()),
(2, 2, '{"valor":false}',   NULL, 1.00, NULL, 'pendiente', NULL, NOW(), NOW()),
(2, 3, '{"blanks":[{"id":1,"valor":"n"}]}', NULL, 1.00, NULL, 'pendiente', NULL, NOW(), NOW());

-- Examen Parcial 1 para Inyecciones (sección 16, docente 5 en tus dummies)
INSERT INTO examen
(id, seccion_id, materia_id, creado_por, tipo, parcial_id, fecha_inicio, duracion_min, intentos_max,
 modo_armado, num_preguntas, dificultad_min, dificultad_max, mezclar_preguntas, mezclar_opciones, estado, created_at, updated_at)
VALUES
(2, 16, 6, 5, 'parcial', 1, '2025-11-20 12:00:00', 50, 1, 'random', 2, 3, 8, 1, 1, 'programado', NOW(), NOW());

INSERT INTO examen_pregunta (examen_id, pregunta_version_id, puntos, orden_base) VALUES
(2, 4, 1.00, 1),
(2, 5, 1.00, 2);

-- Intentos para alumnos de la sección 16 (inscripciones 43 y 44 en tus dummies)
INSERT INTO examen_intento
(id, examen_id, inscripcion_id, intento_num, inicio_real, fin_real, estado, calif_auto, calif_manual, calif_final, created_at, updated_at)
VALUES
(4, 2, 43, 1, '2025-11-20 12:00:00', '2025-11-20 12:40:00', 'enviado', 2.00, NULL, NULL, NOW(), NOW()),
(5, 2, 44, 1, '2025-11-20 12:00:00', '2025-11-20 12:45:00', 'enviado', 1.00, NULL, NULL, NOW(), NOW());

INSERT INTO examen_intento_pregunta (examen_intento_id, pregunta_version_id, orden, opciones_orden_json) VALUES
(4, 5, 1, '{"items":[4,1,0,3,2]}' ),
(4, 4, 2, NULL),
(5, 4, 1, NULL),
(5, 5, 2, '{"items":[0,1,2,3,4]}' );

INSERT INTO examen_respuesta
(examen_intento_id, pregunta_version_id, respuesta_json, respuesta_texto, puntaje_auto, puntaje_manual, estado_revision, feedback, created_at, updated_at)
VALUES
(4, 4, '{"correctas":[{"izq":"Jeringa","der":"Aplicación intramuscular"},{"izq":"Guantes","der":"Protección"},{"izq":"Algodón","der":"Limpieza"}]}', NULL, 1.00, NULL, 'pendiente', NULL, NOW(), NOW()),
(4, 5, '{"orden":[0,1,2,3,4]}', NULL, 1.00, NULL, 'pendiente', NULL, NOW(), NOW());
