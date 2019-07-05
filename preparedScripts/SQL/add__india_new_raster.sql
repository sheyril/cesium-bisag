
INSERT INTO cesium_mosaic(name,tiletable,spatialtable) VALUES ('_india_new_raster','_india_new_raster_tiled_0','_india_new_raster_tiled_0');
INSERT INTO cesium_mosaic(name,tiletable,spatialtable) VALUES ('_india_new_raster','_india_new_raster_tiled_1','_india_new_raster_tiled_1');
INSERT INTO cesium_mosaic(name,tiletable,spatialtable) VALUES ('_india_new_raster','_india_new_raster_tiled_2','_india_new_raster_tiled_2');
INSERT INTO cesium_mosaic(name,tiletable,spatialtable) VALUES ('_india_new_raster','_india_new_raster_tiled_3','_india_new_raster_tiled_3');

 CREATE TABLE _india_new_raster_tiled_0 (location CHAR(64) NOT NULL ,data BYTEA,CONSTRAINT _india_new_raster_tiled_0_PK PRIMARY KEY(location));
 CREATE TABLE _india_new_raster_tiled_1 (location CHAR(64) NOT NULL ,data BYTEA,CONSTRAINT _india_new_raster_tiled_1_PK PRIMARY KEY(location));
 CREATE TABLE _india_new_raster_tiled_2 (location CHAR(64) NOT NULL ,data BYTEA,CONSTRAINT _india_new_raster_tiled_2_PK PRIMARY KEY(location));
 CREATE TABLE _india_new_raster_tiled_3 (location CHAR(64) NOT NULL ,data BYTEA,CONSTRAINT _india_new_raster_tiled_3_PK PRIMARY KEY(location));

select AddGeometryColumn('_india_new_raster_tiled_0','geom',4326,'MULTIPOLYGON',2);
select AddGeometryColumn('_india_new_raster_tiled_1','geom',4326,'MULTIPOLYGON',2);
select AddGeometryColumn('_india_new_raster_tiled_2','geom',4326,'MULTIPOLYGON',2);
select AddGeometryColumn('_india_new_raster_tiled_3','geom',4326,'MULTIPOLYGON',2);

CREATE INDEX IX__india_new_raster_tiled_0 ON _india_new_raster_tiled_0 USING gist(geom) ;
CREATE INDEX IX__india_new_raster_tiled_1 ON _india_new_raster_tiled_1 USING gist(geom) ;
CREATE INDEX IX__india_new_raster_tiled_2 ON _india_new_raster_tiled_2 USING gist(geom) ;
CREATE INDEX IX__india_new_raster_tiled_3 ON _india_new_raster_tiled_3 USING gist(geom) ;
