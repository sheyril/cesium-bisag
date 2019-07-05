CREATE SCHEMA _testing_contours;
CREATE TABLE _testing_contours._testing_contours (
    interval_length SMALLINT NOT NULL,
    min_x DOUBLE PRECISION NOT NULL,
    max_x DOUBLE PRECISION NOT NULL,
    min_y DOUBLE PRECISION NOT NULL,
    max_y DOUBLE PRECISION NOT NULL,
    tiledname VARCHAR(50) PRIMARY KEY
);

CREATE INDEX ix__testing_contours ON _testing_contours._testing_contours (
    interval_length,
    min_x,
    min_y
);
