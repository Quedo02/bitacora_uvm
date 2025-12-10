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
        SUM(COALESCE(fp.final_parcial, 0) * spc.peso_semestre) / 50
        * 50
        +
        COALESCE(ef.calificacion, 0) * 0.50
    , 2) AS final_semestre
FROM inscripcion i
JOIN seccion s ON s.id = i.seccion_id
LEFT JOIN seccion_parcial_config spc
       ON spc.seccion_id = s.id
LEFT JOIN vw_final_parcial_alumno fp
       ON fp.inscripcion_id = i.id AND fp.parcial_id = spc.parcial_id
LEFT JOIN calificacion_examen_final ef
       ON ef.inscripcion_id = i.id
WHERE i.estado='inscrito'
GROUP BY i.id, s.id, ef.calificacion;

-- =========================================================
--  14) SEED / DUMMIES (TODO AL FINAL)
-- =========================================================

-- -------------------------
--  14.1 ROLES
-- -------------------------
INSERT INTO rol (id, nombre, descripcion) VALUES
(1, 'admin', 'Administrador'),
(2, 'coordinador', 'Coordinador de área'),
(3, 'docente_tc', 'Docente tiempo completo'),
(4, 'docente_general', 'Docente general'),
(5, 'estudiante', 'Alumno');

-- -------------------------
--  14.2 USUARIOS
-- -------------------------
INSERT INTO usuario
(id, rol_id, nombre_completo, correo, matricula, password_hash, estado, created_at, updated_at)
VALUES
-- Admin
(1, 1, 'Admin Juan Pablo', 'admin@uvm.edu', 100136748,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

-- Coordinadores base
(2, 2, 'Coord Sistemas Oscar', 'oscar.coordinador@uvm.edu', 100136749,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(3, 2, 'Coord Salud Maria', 'maria.coordinador@uvm.edu', 100136750,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

-- Coordinador extra
(12, 2, 'Coord Negocios Laura', 'laura.coordinador@uvm.edu', 100136751,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

-- Docentes base
(4, 4, 'Docente General Ericka', 'ericka.docente@uvm.edu', 100136755,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(5, 3, 'Docente TC Carcaño', 'carcano.tc@uvm.edu', 100136756,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

-- Docentes extra
(13, 4, 'Docente General Raul', 'raul.docente@uvm.edu', 100136757,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(14, 4, 'Docente General Fernanda', 'fernanda.docente@uvm.edu', 100136758,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(15, 3, 'Docente TC Gomez', 'gomez.tc@uvm.edu', 100136759,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

-- Estudiantes base
(6, 5, 'Ana Torres', 'ana.torres@uvm.edu', 100200001,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(7, 5, 'Luis Herrera', 'luis.herrera@uvm.edu', 100200002,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(8, 5, 'Sofia Reyes', 'sofia.reyes@uvm.edu', 100200003,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(9, 5, 'Diego Cruz', 'diego.cruz@uvm.edu', 100200004,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(10, 5, 'Valeria Medina', 'valeria.medina@uvm.edu', 100200005,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(11, 5, 'Carlos Rios', 'carlos.rios@uvm.edu', 100200006,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

-- Estudiantes extra (más variedad)
(16, 5, 'Andrea Luna', 'andrea.luna@uvm.edu', 100200007,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(17, 5, 'Jorge Salas', 'jorge.salas@uvm.edu', 100200008,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(18, 5, 'Paola Nieto', 'paola.nieto@uvm.edu', 100200009,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(19, 5, 'Ricardo Vega', 'ricardo.vega@uvm.edu', 100200010,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(20, 5, 'Mariana Soto', 'mariana.soto@uvm.edu', 100200011,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(21, 5, 'Hector Mena', 'hector.mena@uvm.edu', 100200012,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(22, 5, 'Camila Ortiz', 'camila.ortiz@uvm.edu', 100200013,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(23, 5, 'Ivan Ponce', 'ivan.ponce@uvm.edu', 100200014,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(24, 5, 'Daniela Rojas', 'daniela.rojas@uvm.edu', 100200015,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),
(25, 5, 'Sebastian Prado', 'sebastian.prado@uvm.edu', 100200016,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW());

-- -------------------------
--  14.3 AREAS
-- -------------------------
INSERT INTO area (id, nombre, estado, created_at, updated_at) VALUES
(1, 'Ingenieria', 'activa', NOW(), NOW()),
(2, 'Salud',      'activa', NOW(), NOW()),
(3, 'Negocios',   'activa', NOW(), NOW());

-- -------------------------
--  14.4 PERFILES
-- -------------------------
INSERT INTO coordinador_profile (usuario_id, area_id, created_at, updated_at) VALUES
(2, 1, NOW(), NOW()),
(3, 2, NOW(), NOW()),
(12, 3, NOW(), NOW());

INSERT INTO docente_profile (usuario_id, categoria, created_at, updated_at) VALUES
(4,  'general',         NOW(), NOW()),
(5,  'tiempo_completo', NOW(), NOW()),
(13, 'general',         NOW(), NOW()),
(14, 'general',         NOW(), NOW()),
(15, 'tiempo_completo', NOW(), NOW());

-- -------------------------
--  14.5 CARRERAS
-- -------------------------
INSERT INTO carrera (id, nombre_carrera, codigo_carrera, area_id, coordinador_id, estado, created_at, updated_at) VALUES
(1, 'Sistemas',        'SC',  1, 2,  'activa', NOW(), NOW()),
(2, 'Mecatronica',     'MEC', 1, 2,  'activa', NOW(), NOW()),
(3, 'Medicina',        'MED', 2, 3,  'activa', NOW(), NOW()),
(4, 'Industrial',      'IND', 1, 2,  'activa', NOW(), NOW()),
(5, 'Enfermeria',      'ENF', 2, 3,  'activa', NOW(), NOW()),
(6, 'Administracion',  'ADM', 3, 12, 'activa', NOW(), NOW()),
(7, 'Finanzas',        'FIN', 3, 12, 'activa', NOW(), NOW());

-- -------------------------
--  14.6 ESTUDIANTE PROFILE
-- -------------------------
INSERT INTO estudiante_profile (usuario_id, carrera_id, created_at, updated_at) VALUES
(6,  1, NOW(), NOW()),
(7,  1, NOW(), NOW()),
(8,  2, NOW(), NOW()),
(9,  2, NOW(), NOW()),
(10, 3, NOW(), NOW()),
(11, 3, NOW(), NOW()),
(16, 1, NOW(), NOW()),
(17, 1, NOW(), NOW()),
(18, 4, NOW(), NOW()),
(19, 4, NOW(), NOW()),
(20, 5, NOW(), NOW()),
(21, 6, NOW(), NOW()),
(22, 6, NOW(), NOW()),
(23, 7, NOW(), NOW()),
(24, 7, NOW(), NOW()),
(25, 2, NOW(), NOW());

-- -------------------------
--  14.7 MATERIAS (más catálogo)
-- -------------------------
INSERT INTO materia (id, nombre_materia, codigo_materia, tipo_evaluacion, estado, created_at, updated_at) VALUES
(1, 'Matematicas',      'MATE01H', 'practica', 'activa', NOW(), NOW()),
(2, 'Cerebro',          'CERE01H', 'teorica',  'activa', NOW(), NOW()),
(3, 'Algebra',          'ALGE01H', 'practica', 'activa', NOW(), NOW()),
(4, 'Redes I',          'RED01H',  'practica', 'activa', NOW(), NOW()),
(5, 'Programacion I',   'PROG01H', 'practica', 'activa', NOW(), NOW()),
(6, 'Anatomia',         'ANAT01H', 'teorica',  'activa', NOW(), NOW()),
(7, 'Fisiologia',       'FISI01H', 'teorica',  'activa', NOW(), NOW()),
(8, 'Estadistica',      'ESTA01H', 'teorica',  'activa', NOW(), NOW()),
(9, 'Contabilidad',     'CONT01H', 'teorica',  'activa', NOW(), NOW()),
(10,'Economia',         'ECON01H', 'teorica',  'activa', NOW(), NOW());

-- -------------------------
--  14.8 CARRERA_MATERIA
-- -------------------------
INSERT INTO carrera_materia (carrera_id, materia_id, num_semestre, estado, created_at, updated_at) VALUES
-- Sistemas
(1, 1, 1, 'activa', NOW(), NOW()),
(1, 3, 1, 'activa', NOW(), NOW()),
(1, 5, 1, 'activa', NOW(), NOW()),
(1, 4, 2, 'activa', NOW(), NOW()),
(1, 8, 3, 'activa', NOW(), NOW()),

-- Mecatronica
(2, 1, 1, 'activa', NOW(), NOW()),
(2, 3, 1, 'activa', NOW(), NOW()),
(2, 8, 2, 'activa', NOW(), NOW()),

-- Industrial
(4, 1, 1, 'activa', NOW(), NOW()),
(4, 8, 2, 'activa', NOW(), NOW()),
(4, 4, 3, 'activa', NOW(), NOW()),

-- Medicina
(3, 2, 1, 'activa', NOW(), NOW()),
(3, 6, 1, 'activa', NOW(), NOW()),
(3, 7, 2, 'activa', NOW(), NOW()),

-- Enfermeria
(5, 6, 1, 'activa', NOW(), NOW()),
(5, 7, 1, 'activa', NOW(), NOW()),
(5, 8, 2, 'activa', NOW(), NOW()),

-- Administracion
(6, 9, 1, 'activa', NOW(), NOW()),
(6, 10,1, 'activa', NOW(), NOW()),
(6, 8, 2, 'activa', NOW(), NOW()),

-- Finanzas
(7, 10,1, 'activa', NOW(), NOW()),
(7, 9, 1, 'activa', NOW(), NOW()),
(7, 8, 2, 'activa', NOW(), NOW());

-- -------------------------
--  14.9 PERIODOS (más realistas)
-- -------------------------
INSERT INTO periodo (id, codigo, nombre, fecha_inicio, fecha_fin, estado, created_at, updated_at) VALUES
(1, '2025-C1', 'Primavera', '2025-02-20', '2025-07-17', 'cerrado',  NOW(), NOW()),
(2, '2025-C2', 'Otoño',     '2025-08-18', '2026-01-17', 'activo',   NOW(), NOW()),
(3, '2024-C2', 'Otoño',     '2024-08-19', '2025-01-18', 'cerrado',  NOW(), NOW()),
(4, '2026-C1', 'Primavera', '2026-02-19', '2026-07-16', 'planeado', NOW(), NOW());

-- -------------------------
--  14.10 SECCIONES
-- -------------------------
INSERT INTO seccion
(id, materia_id, carrera_id, periodo_id, grupo, docente_id, modalidad, estado, created_at, updated_at)
VALUES
-- =========================
-- Históricas 2025-C1
-- =========================
(1, 1, 1, 1, 'A', 5, 'presencial', 'activa', NOW(), NOW()), -- SC Mates A
(2, 1, 1, 1, 'B', 4, 'presencial', 'activa', NOW(), NOW()), -- SC Mates B
(3, 2, 3, 1, 'A', 4, 'presencial', 'activa', NOW(), NOW()), -- MED Cerebro A

-- =========================
-- Actuales 2025-C2 (más variedad)
-- =========================
(4, 1, 1, 2, 'A', 5,  'presencial', 'activa', NOW(), NOW()), -- SC Mates A
(5, 3, 1, 2, 'A', 15, 'presencial', 'activa', NOW(), NOW()), -- SC Algebra A
(6, 4, 1, 2, 'B', 13, 'presencial', 'activa', NOW(), NOW()), -- SC Redes I B
(7, 5, 1, 2, 'A', 14, 'mixta',      'activa', NOW(), NOW()), -- SC Prog I A

(8, 3, 2, 2, 'A', 15, 'presencial', 'activa', NOW(), NOW()), -- MEC Algebra A
(9, 8, 2, 2, 'A', 13, 'linea',      'activa', NOW(), NOW()), -- MEC Estadistica A

(10, 6, 3, 2, 'A', 4,  'presencial', 'activa', NOW(), NOW()), -- MED Anatomia A
(11, 7, 3, 2, 'A', 5,  'presencial', 'activa', NOW(), NOW()), -- MED Fisiologia A

(12, 6, 5, 2, 'A', 14, 'presencial', 'activa', NOW(), NOW()), -- ENF Anatomia A
(13, 8, 5, 2, 'B', 13, 'mixta',      'activa', NOW(), NOW()), -- ENF Estadistica B

(14, 9, 6, 2, 'A', 13, 'linea',      'activa', NOW(), NOW()), -- ADM Contabilidad A
(15, 10,6, 2, 'A', 14, 'presencial', 'activa', NOW(), NOW()), -- ADM Economia A

(16, 9, 7, 2, 'A', 15, 'presencial', 'activa', NOW(), NOW()), -- FIN Contabilidad A
(17, 10,7, 2, 'B', 13, 'linea',      'activa', NOW(), NOW()); -- FIN Economia B

-- -------------------------
--  14.11 SECCION_COMPONENTE (3 CRN c/u)
-- -------------------------
INSERT INTO seccion_componente
(seccion_id, tipo, crn, peso_porcentaje, estado, created_at, updated_at)
VALUES
-- 2025-C1 (prefijo 2501)
(1, 'blackboard', '2501-MATE-SC-A-BB',   50.00, 'activo', NOW(), NOW()),
(1, 'continua',   '2501-MATE-SC-A-CONT', 40.00, 'activo', NOW(), NOW()),
(1, 'examen',     '2501-MATE-SC-A-EX',   10.00, 'activo', NOW(), NOW()),

(2, 'blackboard', '2501-MATE-SC-B-BB',   50.00, 'activo', NOW(), NOW()),
(2, 'continua',   '2501-MATE-SC-B-CONT', 40.00, 'activo', NOW(), NOW()),
(2, 'examen',     '2501-MATE-SC-B-EX',   10.00, 'activo', NOW(), NOW()),

(3, 'blackboard', '2501-CERE-MED-A-BB',  50.00, 'activo', NOW(), NOW()),
(3, 'continua',   '2501-CERE-MED-A-CONT',20.00, 'activo', NOW(), NOW()),
(3, 'examen',     '2501-CERE-MED-A-EX',  30.00, 'activo', NOW(), NOW()),

-- 2025-C2 (prefijo 2502)
(4, 'blackboard', '2502-MATE-SC-A-BB',   50.00, 'activo', NOW(), NOW()),
(4, 'continua',   '2502-MATE-SC-A-CONT', 40.00, 'activo', NOW(), NOW()),
(4, 'examen',     '2502-MATE-SC-A-EX',   10.00, 'activo', NOW(), NOW()),

(5, 'blackboard', '2502-ALGE-SC-A-BB',   45.00, 'activo', NOW(), NOW()),
(5, 'continua',   '2502-ALGE-SC-A-CONT', 35.00, 'activo', NOW(), NOW()),
(5, 'examen',     '2502-ALGE-SC-A-EX',   20.00, 'activo', NOW(), NOW()),

(6, 'blackboard', '2502-RED1-SC-B-BB',   40.00, 'activo', NOW(), NOW()),
(6, 'continua',   '2502-RED1-SC-B-CONT', 40.00, 'activo', NOW(), NOW()),
(6, 'examen',     '2502-RED1-SC-B-EX',   20.00, 'activo', NOW(), NOW()),

(7, 'blackboard', '2502-PROG-SC-A-BB',   30.00, 'activo', NOW(), NOW()),
(7, 'continua',   '2502-PROG-SC-A-CONT', 50.00, 'activo', NOW(), NOW()),
(7, 'examen',     '2502-PROG-SC-A-EX',   20.00, 'activo', NOW(), NOW()),

(8, 'blackboard', '2502-ALGE-MEC-A-BB',  50.00, 'activo', NOW(), NOW()),
(8, 'continua',   '2502-ALGE-MEC-A-CONT',30.00, 'activo', NOW(), NOW()),
(8, 'examen',     '2502-ALGE-MEC-A-EX',  20.00, 'activo', NOW(), NOW()),

(9, 'blackboard', '2502-ESTA-MEC-A-BB',  60.00, 'activo', NOW(), NOW()),
(9, 'continua',   '2502-ESTA-MEC-A-CONT',20.00, 'activo', NOW(), NOW()),
(9, 'examen',     '2502-ESTA-MEC-A-EX',  20.00, 'activo', NOW(), NOW()),

(10,'blackboard', '2502-ANAT-MED-A-BB',  50.00, 'activo', NOW(), NOW()),
(10,'continua',   '2502-ANAT-MED-A-CONT',25.00, 'activo', NOW(), NOW()),
(10,'examen',     '2502-ANAT-MED-A-EX',  25.00, 'activo', NOW(), NOW()),

(11,'blackboard', '2502-FISI-MED-A-BB',  50.00, 'activo', NOW(), NOW()),
(11,'continua',   '2502-FISI-MED-A-CONT',20.00, 'activo', NOW(), NOW()),
(11,'examen',     '2502-FISI-MED-A-EX',  30.00, 'activo', NOW(), NOW()),

(12,'blackboard', '2502-ANAT-ENF-A-BB',  55.00, 'activo', NOW(), NOW()),
(12,'continua',   '2502-ANAT-ENF-A-CONT',25.00, 'activo', NOW(), NOW()),
(12,'examen',     '2502-ANAT-ENF-A-EX',  20.00, 'activo', NOW(), NOW()),

(13,'blackboard', '2502-ESTA-ENF-B-BB',  50.00, 'activo', NOW(), NOW()),
(13,'continua',   '2502-ESTA-ENF-B-CONT',30.00, 'activo', NOW(), NOW()),
(13,'examen',     '2502-ESTA-ENF-B-EX',  20.00, 'activo', NOW(), NOW()),

(14,'blackboard', '2502-CONT-ADM-A-BB',  40.00, 'activo', NOW(), NOW()),
(14,'continua',   '2502-CONT-ADM-A-CONT',40.00, 'activo', NOW(), NOW()),
(14,'examen',     '2502-CONT-ADM-A-EX',  20.00, 'activo', NOW(), NOW()),

(15,'blackboard', '2502-ECON-ADM-A-BB',  45.00, 'activo', NOW(), NOW()),
(15,'continua',   '2502-ECON-ADM-A-CONT',35.00, 'activo', NOW(), NOW()),
(15,'examen',     '2502-ECON-ADM-A-EX',  20.00, 'activo', NOW(), NOW()),

(16,'blackboard', '2502-CONT-FIN-A-BB',  50.00, 'activo', NOW(), NOW()),
(16,'continua',   '2502-CONT-FIN-A-CONT',20.00, 'activo', NOW(), NOW()),
(16,'examen',     '2502-CONT-FIN-A-EX',  30.00, 'activo', NOW(), NOW()),

(17,'blackboard', '2502-ECON-FIN-B-BB',  50.00, 'activo', NOW(), NOW()),
(17,'continua',   '2502-ECON-FIN-B-CONT',25.00, 'activo', NOW(), NOW()),
(17,'examen',     '2502-ECON-FIN-B-EX',  25.00, 'activo', NOW(), NOW());

-- -------------------------
--  14.12 INSCRIPCIONES (más casos)
-- -------------------------
INSERT INTO inscripcion
(id, seccion_id, estudiante_id, estado, metodo, created_at, updated_at)
VALUES
-- 2025-C1
(1, 1, 6,  'inscrito', 'presencial', NOW(), NOW()),
(2, 1, 7,  'inscrito', 'presencial', NOW(), NOW()),
(3, 2, 6,  'inscrito', 'presencial', NOW(), NOW()),
(4, 3, 10, 'inscrito', 'presencial', NOW(), NOW()),
(5, 3, 11, 'inscrito', 'presencial', NOW(), NOW()),

-- 2025-C2 Sistemas
(6, 4, 16, 'inscrito', 'presencial', NOW(), NOW()),
(7, 4, 17, 'inscrito', 'presencial', NOW(), NOW()),
(8, 5, 6,  'inscrito', 'presencial', NOW(), NOW()),
(9, 5, 7,  'inscrito', 'presencial', NOW(), NOW()),
(10,6, 16, 'inscrito', 'presencial', NOW(), NOW()),
(11,7, 17, 'inscrito', 'linea',      NOW(), NOW()),

-- Mecatronica
(12,8, 8,  'inscrito', 'presencial', NOW(), NOW()),
(13,8, 9,  'inscrito', 'presencial', NOW(), NOW()),
(14,9, 25, 'inscrito', 'linea',      NOW(), NOW()),

-- Medicina / Enfermeria
(15,10,10, 'inscrito', 'presencial', NOW(), NOW()),
(16,10,11, 'inscrito', 'presencial', NOW(), NOW()),
(17,11,10, 'inscrito', 'presencial', NOW(), NOW()),
(18,12,20, 'inscrito', 'presencial', NOW(), NOW()),
(19,13,20, 'inscrito', 'mixta',      NOW(), NOW()),

-- Administracion
(20,14,21, 'inscrito', 'linea',      NOW(), NOW()),
(21,15,22, 'inscrito', 'presencial', NOW(), NOW()),

-- Finanzas
(22,16,23, 'inscrito', 'presencial', NOW(), NOW()),
(23,17,24, 'inscrito', 'linea',      NOW(), NOW());

-- -------------------------
--  14.13 PARCIALES
-- -------------------------
INSERT INTO parcial (id, nombre, orden) VALUES
(1, 'Parcial 1', 1),
(2, 'Parcial 2', 2),
(3, 'Parcial 3', 3);

-- -------------------------
--  14.14 CONFIG PARCIALES POR SECCION
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

-- -------------------------
--  14.15 ACTIVIDADES (más secciones)
-- -------------------------
INSERT INTO actividad
(id, seccion_id, parcial_id, componente, origen, nombre, peso_en_componente, created_at, updated_at)
VALUES
-- Seccion 1 (SC Mates A - 2025-C1) P1
(1, 1, 1, 'blackboard', 'blackboard', 'BB Tarea 1', 50.00, NOW(), NOW()),
(2, 1, 1, 'blackboard', 'blackboard', 'BB Tarea 2', 50.00, NOW(), NOW()),
(3, 1, 1, 'continua',   'teams',      'Teams Actividad 1', 60.00, NOW(), NOW()),
(4, 1, 1, 'continua',   'teams',      'Teams Actividad 2', 40.00, NOW(), NOW()),

-- Seccion 3 (MED Cerebro A - 2025-C1) P1
(5, 3, 1, 'blackboard', 'blackboard', 'BB Caso 1', 100.00, NOW(), NOW()),
(6, 3, 1, 'continua',   'teams',      'Teams Reporte 1', 100.00, NOW(), NOW()),

-- Seccion 4 (SC Mates A - 2025-C2) P1
(7, 4, 1, 'blackboard', 'blackboard', 'BB Quiz 1', 40.00, NOW(), NOW()),
(8, 4, 1, 'blackboard', 'blackboard', 'BB Quiz 2', 60.00, NOW(), NOW()),
(9, 4, 1, 'continua',   'teams',      'Teams Taller 1', 50.00, NOW(), NOW()),
(10,4, 1, 'continua',   'teams',      'Teams Taller 2', 50.00, NOW(), NOW()),

-- Seccion 5 (SC Algebra A - 2025-C2) P1
(11,5, 1, 'blackboard', 'blackboard', 'BB Ejercicios 1', 100.00, NOW(), NOW()),
(12,5, 1, 'continua',   'manual',     'Practica Aula 1', 100.00, NOW(), NOW()),

-- Seccion 7 (SC Prog I A - 2025-C2) P1
(13,7, 1, 'blackboard', 'blackboard', 'BB Proyecto 1', 100.00, NOW(), NOW()),
(14,7, 1, 'continua',   'teams',      'Code Review 1', 100.00, NOW(), NOW()),

-- Seccion 10 (MED Anatomia A - 2025-C2) P1
(15,10,1, 'blackboard', 'blackboard', 'BB Guia 1', 100.00, NOW(), NOW()),
(16,10,1, 'continua',   'teams',      'Practica Lab 1', 100.00, NOW(), NOW()),

-- Seccion 14 (ADM Contabilidad A - 2025-C2) P1
(17,14,1, 'blackboard', 'blackboard', 'BB Caso 1', 100.00, NOW(), NOW()),
(18,14,1, 'continua',   'teams',      'Teams Ejercicio 1', 100.00, NOW(), NOW());

-- -------------------------
--  14.16 CALIFICACION ACTIVIDAD
-- -------------------------
INSERT INTO calificacion_actividad
(actividad_id, inscripcion_id, calificacion, created_at, updated_at)
VALUES
-- Seccion 1 (insc 1,2)
(1, 1, 90.00, NOW(), NOW()),
(2, 1, 80.00, NOW(), NOW()),
(3, 1, 85.00, NOW(), NOW()),
(4, 1, 95.00, NOW(), NOW()),
(1, 2, 70.00, NOW(), NOW()),
(2, 2, 75.00, NOW(), NOW()),
(3, 2, 88.00, NOW(), NOW()),
(4, 2, 92.00, NOW(), NOW()),

-- Seccion 3 (insc 4,5)
(5, 4, 86.00, NOW(), NOW()),
(6, 4, 90.00, NOW(), NOW()),
(5, 5, 78.00, NOW(), NOW()),
(6, 5, 85.00, NOW(), NOW()),

-- Seccion 4 (insc 6,7)
(7, 6, 92.00, NOW(), NOW()),
(8, 6, 88.00, NOW(), NOW()),
(9, 6, 95.00, NOW(), NOW()),
(10,6, 90.00, NOW(), NOW()),
(7, 7, 80.00, NOW(), NOW()),
(8, 7, 85.00, NOW(), NOW()),
(9, 7, 78.00, NOW(), NOW()),
(10,7, 82.00, NOW(), NOW()),

-- Seccion 5 (insc 8,9)
(11,8, 90.00, NOW(), NOW()),
(12,8, 88.00, NOW(), NOW()),
(11,9, 76.00, NOW(), NOW()),
(12,9, 80.00, NOW(), NOW()),

-- Seccion 7 (insc 11)
(13,11, 94.00, NOW(), NOW()),
(14,11, 96.00, NOW(), NOW()),

-- Seccion 10 (insc 15,16)
(15,15, 85.00, NOW(), NOW()),
(16,15, 90.00, NOW(), NOW()),
(15,16, 78.00, NOW(), NOW()),
(16,16, 84.00, NOW(), NOW()),

-- Seccion 14 (insc 20)
(17,20, 92.00, NOW(), NOW()),
(18,20, 88.00, NOW(), NOW());

-- -------------------------
--  14.17 EXAMEN PARCIAL P1
-- -------------------------
INSERT INTO calificacion_examen_parcial
(inscripcion_id, parcial_id, calificacion, created_at, updated_at)
VALUES
(1,  1, 88.00, NOW(), NOW()),
(2,  1, 80.00, NOW(), NOW()),
(4,  1, 84.00, NOW(), NOW()),
(5,  1, 79.00, NOW(), NOW()),
(6,  1, 90.00, NOW(), NOW()),
(7,  1, 82.00, NOW(), NOW()),
(8,  1, 86.00, NOW(), NOW()),
(9,  1, 78.00, NOW(), NOW()),
(11, 1, 95.00, NOW(), NOW()),
(15, 1, 88.00, NOW(), NOW()),
(16, 1, 80.00, NOW(), NOW()),
(20, 1, 90.00, NOW(), NOW());

-- -------------------------
--  14.18 EXAMEN FINAL
-- -------------------------
INSERT INTO calificacion_examen_final
(inscripcion_id, calificacion, created_at, updated_at)
VALUES
(1,  90.00, NOW(), NOW()),
(2,  82.00, NOW(), NOW()),
(4,  88.00, NOW(), NOW()),
(5,  80.00, NOW(), NOW()),
(6,  92.00, NOW(), NOW()),
(7,  85.00, NOW(), NOW()),
(15, 90.00, NOW(), NOW()),
(16, 84.00, NOW(), NOW()),
(20, 88.00, NOW(), NOW());


-- =========================================================
--  14) AREA_MATERIA (CATÁLOGO POR ÁREA)
-- =========================================================
CREATE TABLE area_materia (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    area_id    INT UNSIGNED NOT NULL,
    materia_id INT UNSIGNED NOT NULL,
    estado     ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY ux_area_materia (area_id, materia_id),
    KEY ix_am_area_id (area_id),
    KEY ix_am_materia_id (materia_id),

    CONSTRAINT fk_am_area
        FOREIGN KEY (area_id)
        REFERENCES area (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_am_materia
        FOREIGN KEY (materia_id)
        REFERENCES materia (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================================
--  15) AREA_APROBADOR_TC (1 DOCENTE TC APROBADOR POR ÁREA)
-- =========================================================
CREATE TABLE area_aprobador_tc (
    area_id        INT UNSIGNED NOT NULL,
    docente_tc_id  INT UNSIGNED NOT NULL,
    estado         ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (area_id),
    UNIQUE KEY ux_aap_docente (docente_tc_id),

    CONSTRAINT fk_aap_area
        FOREIGN KEY (area_id)
        REFERENCES area (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Garantiza que exista perfil docente
    CONSTRAINT fk_aap_docente_profile
        FOREIGN KEY (docente_tc_id)
        REFERENCES docente_profile (usuario_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================================
--  16) BANCO_PREGUNTA (TABLA PADRE)
-- =========================================================
CREATE TABLE banco_pregunta (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    area_materia_id  INT UNSIGNED NOT NULL,

    -- Para docentes: amarra a la sección que imparte/impartió.
    -- Para coordinadores: puede ser NULL.
    seccion_id       INT UNSIGNED NULL,

    creador_id       INT UNSIGNED NOT NULL, -- usuario que crea la pregunta

    tipo             ENUM(
                        'opcion_multiple',
                        'multiple_respuesta',
                        'verdadero_falso',
                        'abierta',
                        'relacionar',
                        'ordenar',
                        'completar'
                     ) NOT NULL,

    estado_workflow  ENUM(
                        'borrador',
                        'en_revision',
                        'aprobada',
                        'rechazada',
                        'archivada'
                     ) NOT NULL DEFAULT 'borrador',

    dificultad       ENUM('facil','media','dificil') NOT NULL DEFAULT 'media',
    puntaje          DECIMAL(5,2) NOT NULL DEFAULT 1.00,

    enunciado        TEXT NOT NULL,
    instrucciones    TEXT NULL,
    explicacion      TEXT NULL,

    version          SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY ix_bp_area_materia (area_materia_id),
    KEY ix_bp_seccion_id (seccion_id),
    KEY ix_bp_creador_id (creador_id),
    KEY ix_bp_estado (estado_workflow),
    KEY ix_bp_tipo (tipo),

    CONSTRAINT fk_bp_area_materia
        FOREIGN KEY (area_materia_id)
        REFERENCES area_materia (id)
        ON UPDATE CASCADE,

    CONSTRAINT fk_bp_seccion
        FOREIGN KEY (seccion_id)
        REFERENCES seccion (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_bp_creador
        FOREIGN KEY (creador_id)
        REFERENCES usuario (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================================
--  17) PREGUNTA_OPCION
-- =========================================================
CREATE TABLE pregunta_opcion (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    pregunta_id INT UNSIGNED NOT NULL,
    texto       VARCHAR(500) NOT NULL,
    es_correcta TINYINT(1) NOT NULL DEFAULT 0,
    orden       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    feedback    TEXT NULL,

    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY ux_po_pregunta_orden (pregunta_id, orden),
    KEY ix_po_pregunta_id (pregunta_id),

    CONSTRAINT fk_po_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES banco_pregunta (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================================
--  18) PREGUNTA_VERDADERO_FALSO
-- =========================================================
CREATE TABLE pregunta_verdadero_falso (
    pregunta_id       INT UNSIGNED NOT NULL,
    respuesta_correcta ENUM('verdadero','falso') NOT NULL,

    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (pregunta_id),

    CONSTRAINT fk_pvf_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES banco_pregunta (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================================================
--  19) PREGUNTA_ABIERTA
-- =========================================================
CREATE TABLE pregunta_abierta (
    pregunta_id      INT UNSIGNED NOT NULL,
    respuesta_modelo TEXT NULL,
    rubrica          TEXT NULL,
    longitud_maxima  SMALLINT UNSIGNED NULL,

    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (pregunta_id),

    CONSTRAINT fk_pa_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES banco_pregunta (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================================================
--  20) PREGUNTA_RELACION_PAR
-- =========================================================
CREATE TABLE pregunta_relacion_par (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    pregunta_id   INT UNSIGNED NOT NULL,
    lado_izquierdo VARCHAR(255) NOT NULL,
    lado_derecho   VARCHAR(255) NOT NULL,
    orden         SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY ux_prp_pregunta_orden (pregunta_id, orden),
    KEY ix_prp_pregunta_id (pregunta_id),

    CONSTRAINT fk_prp_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES banco_pregunta (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================================================
--  21) PREGUNTA_ORDEN_ITEM
-- =========================================================
CREATE TABLE pregunta_orden_item (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    pregunta_id      INT UNSIGNED NOT NULL,
    texto            VARCHAR(255) NOT NULL,
    posicion_correcta SMALLINT UNSIGNED NOT NULL,

    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY ux_poi_pregunta_pos (pregunta_id, posicion_correcta),
    KEY ix_poi_pregunta_id (pregunta_id),

    CONSTRAINT fk_poi_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES banco_pregunta (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================================================
--  22) PREGUNTA_COMPLETAR
-- =========================================================
CREATE TABLE pregunta_completar (
    pregunta_id INT UNSIGNED NOT NULL,
    texto_base  TEXT NOT NULL,

    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (pregunta_id),

    CONSTRAINT fk_pc_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES banco_pregunta (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE pregunta_completar_blanco (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    pregunta_id       INT UNSIGNED NOT NULL,
    indice            SMALLINT UNSIGNED NOT NULL, -- 1,2,3... según el orden de los huecos
    respuesta_correcta VARCHAR(255) NOT NULL,
    respuestas_aceptadas JSON NULL, -- opcional: sinónimos/variantes

    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY ux_pcb_pregunta_indice (pregunta_id, indice),
    KEY ix_pcb_pregunta_id (pregunta_id),

    CONSTRAINT fk_pcb_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES banco_pregunta (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- =========================================================
--  23) PREGUNTA_REVISION (AUDITORÍA)
-- =========================================================
CREATE TABLE pregunta_revision (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    pregunta_id INT UNSIGNED NOT NULL,
    revisor_id  INT UNSIGNED NOT NULL,

    accion      ENUM(
                    'comentario',
                    'en_revision',
                    'aprobada',
                    'rechazada',
                    'archivada',
                    'reactivada'
                ) NOT NULL,

    comentario  TEXT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY ix_prev_pregunta_id (pregunta_id),
    KEY ix_prev_revisor_id (revisor_id),

    CONSTRAINT fk_prev_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES banco_pregunta (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_prev_revisor
        FOREIGN KEY (revisor_id)
        REFERENCES usuario (id)
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================================
--  24) VIEW BASE DEL BANCO
-- =========================================================
CREATE OR REPLACE VIEW vw_banco_preguntas_base AS
SELECT
    bp.id AS pregunta_id,
    bp.tipo,
    bp.estado_workflow,
    bp.dificultad,
    bp.puntaje,
    bp.enunciado,
    bp.instrucciones,
    bp.explicacion,
    bp.version,
    bp.creador_id,
    u.nombre_completo AS creador_nombre,
    am.area_id,
    a.nombre AS area_nombre,
    am.materia_id,
    m.codigo_materia,
    m.nombre_materia,
    bp.seccion_id,
    bp.created_at,
    bp.updated_at
FROM banco_pregunta bp
JOIN area_materia am ON am.id = bp.area_materia_id
JOIN area a ON a.id = am.area_id
JOIN materia m ON m.id = am.materia_id
JOIN usuario u ON u.id = bp.creador_id;
