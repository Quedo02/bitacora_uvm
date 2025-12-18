-- =========================================================
--  BITACORA UVM
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

INSERT INTO rol (id, nombre, descripcion) VALUES
(1, 'admin', 'Administrador'),
(2, 'coordinador', 'Coordinador de área'),
(3, 'docente_tc', 'Docente tiempo completo'),
(4, 'docente_general', 'Docente general'),
(5, 'estudiante', 'Alumno');

INSERT INTO usuario
(id, rol_id, nombre_completo, correo, matricula, password_hash, estado, created_at, updated_at)
VALUES
(1, 1, 'Admin Juan Pablo', 'admin@uvm.edu', 100136748,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(2, 2, 'Coord Sistemas Oscar', 'inge@uvm.edu', 100136749,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(3, 2, 'Coord Salud Maria', 'salud@uvm.edu', 100136750,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(4, 2, 'Coord Sociales Dulce', 'sociales@uvm.edu', 100136751,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(5, 2, 'Coord Diseño Erick', 'diseño@uvm.edu', 100136752,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(6, 2, 'Coord Turismo Daniel', 'turismo@uvm.edu', 100136753,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW()),

(7, 2, 'Coord Negocios Jose', 'negocios@uvm.edu', 100136754,
 '$2y$10$oYY3wqyPFkyN2nEUsXFktO.Xb9xKrXtTnS614ENDHifwAWn8jBrKq', 'activo', NOW(), NOW());

INSERT INTO area (id, nombre, estado, created_at, updated_at) VALUES
(1, 'Ingenieria', 'activa', NOW(), NOW()),
(2, 'Ciencias de la salud', 'activa', NOW(), NOW()),
(3, 'Ciencias sociales', 'activa', NOW(), NOW()),
(4, 'Diseño y arquitectura', 'activa', NOW(), NOW()),
(5, 'Turismo, hospitalidad y gastronomia', 'activa', NOW(), NOW()),
(6, 'Negocios', 'activa', NOW(), NOW());

INSERT INTO coordinador_profile (usuario_id, area_id, created_at, updated_at) VALUES
(2, 1, NOW(), NOW()),
(3, 2, NOW(), NOW()),
(4, 3, NOW(), NOW()),
(5, 4, NOW(), NOW()),
(6, 5, NOW(), NOW()),
(7, 6, NOW(), NOW());

INSERT INTO periodo (id, codigo, nombre, fecha_inicio, fecha_fin, estado, created_at, updated_at) VALUES
(1, '2025-C1', 'Primavera', '2025-02-20', '2025-07-17', 'cerrado',  NOW(), NOW()),
(2, '2025-C2', 'Otoño',     '2025-08-18', '2026-01-17', 'activo',   NOW(), NOW()),
(3, '2026-C1', 'Primavera', '2026-02-20', '2026-07-17', 'planeado', NOW(), NOW());

INSERT INTO parcial (id, nombre, orden) VALUES
(1, 'Parcial 1', 1),
(2, 'Parcial 2', 2),
(3, 'Parcial 3', 3);

INSERT INTO seccion_parcial_config (seccion_id, parcial_id, peso_semestre)
SELECT s.id, p.id,
       CASE p.id
           WHEN 1 THEN 16.67
           WHEN 2 THEN 16.67
           WHEN 3 THEN 16.66
       END
FROM seccion s
CROSS JOIN parcial p;