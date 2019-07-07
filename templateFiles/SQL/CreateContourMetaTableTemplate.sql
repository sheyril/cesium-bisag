CREATE SCHEMA __layername__;
CREATE TABLE __layername__.__layername__ (
    interval_length SMALLINT NOT NULL,
    zoom_level SMALLINT NOT NULL,
    min_x DOUBLE PRECISION NOT NULL,
    max_x DOUBLE PRECISION NOT NULL,
    min_y DOUBLE PRECISION NOT NULL,
    max_y DOUBLE PRECISION NOT NULL,
    tiledname VARCHAR(50) PRIMARY KEY
);

CREATE INDEX __indexname__ ON __layername__.__layername__ (
    interval_length,
    min_x,
    min_y
);

CREATE TABLE __layername__.zoom_reference (
    zoom_level SMALLINT PRIMARY KEY,
    delta_x DOUBLE PRECISION NOT NULL,
    delta_y DOUBLE PRECISION NOT NULL
);