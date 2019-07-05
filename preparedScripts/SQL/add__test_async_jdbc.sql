
INSERT INTO cesium_mosaic(name,tiletable,spatialtable) VALUES ('_test_async_jdbc','_test_async_jdbc_tiled_0','_test_async_jdbc_tiled_0');
INSERT INTO cesium_mosaic(name,tiletable,spatialtable) VALUES ('_test_async_jdbc','_test_async_jdbc_tiled_1','_test_async_jdbc_tiled_1');
INSERT INTO cesium_mosaic(name,tiletable,spatialtable) VALUES ('_test_async_jdbc','_test_async_jdbc_tiled_2','_test_async_jdbc_tiled_2');
INSERT INTO cesium_mosaic(name,tiletable,spatialtable) VALUES ('_test_async_jdbc','_test_async_jdbc_tiled_3','_test_async_jdbc_tiled_3');

 CREATE TABLE _test_async_jdbc_tiled_0 (location CHAR(64) NOT NULL ,data BYTEA,CONSTRAINT _test_async_jdbc_tiled_0_PK PRIMARY KEY(location));
 CREATE TABLE _test_async_jdbc_tiled_1 (location CHAR(64) NOT NULL ,data BYTEA,CONSTRAINT _test_async_jdbc_tiled_1_PK PRIMARY KEY(location));
 CREATE TABLE _test_async_jdbc_tiled_2 (location CHAR(64) NOT NULL ,data BYTEA,CONSTRAINT _test_async_jdbc_tiled_2_PK PRIMARY KEY(location));
 CREATE TABLE _test_async_jdbc_tiled_3 (location CHAR(64) NOT NULL ,data BYTEA,CONSTRAINT _test_async_jdbc_tiled_3_PK PRIMARY KEY(location));

select AddGeometryColumn('_test_async_jdbc_tiled_0','geom',4326,'MULTIPOLYGON',2);
select AddGeometryColumn('_test_async_jdbc_tiled_1','geom',4326,'MULTIPOLYGON',2);
select AddGeometryColumn('_test_async_jdbc_tiled_2','geom',4326,'MULTIPOLYGON',2);
select AddGeometryColumn('_test_async_jdbc_tiled_3','geom',4326,'MULTIPOLYGON',2);

CREATE INDEX IX__test_async_jdbc_tiled_0 ON _test_async_jdbc_tiled_0 USING gist(geom) ;
CREATE INDEX IX__test_async_jdbc_tiled_1 ON _test_async_jdbc_tiled_1 USING gist(geom) ;
CREATE INDEX IX__test_async_jdbc_tiled_2 ON _test_async_jdbc_tiled_2 USING gist(geom) ;
CREATE INDEX IX__test_async_jdbc_tiled_3 ON _test_async_jdbc_tiled_3 USING gist(geom) ;
