CREATE SCHEMA _my_contours;
CREATE TABLE _my_contours._my_contours (
    interval_length SMALLINT NOT NULL,
    zoom_level SMALLINT NOT NULL,
    min_x DOUBLE PRECISION NOT NULL,
    max_x DOUBLE PRECISION NOT NULL,
    min_y DOUBLE PRECISION NOT NULL,
    max_y DOUBLE PRECISION NOT NULL,
    tiledname VARCHAR(50) PRIMARY KEY
);

CREATE INDEX ix__my_contours ON _my_contours._my_contours (
    interval_length,
    min_x,
    min_y
);
