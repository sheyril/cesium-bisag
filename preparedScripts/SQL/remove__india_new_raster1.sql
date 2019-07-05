
drop index IX__india_new_raster1_tiled_0;
drop index IX__india_new_raster1_tiled_1;
drop index IX__india_new_raster1_tiled_2;
drop index IX__india_new_raster1_tiled_3;

select DropGeometryColumn('_india_new_raster1_tiled_0','geom');
select DropGeometryColumn('_india_new_raster1_tiled_1','geom');
select DropGeometryColumn('_india_new_raster1_tiled_2','geom');
select DropGeometryColumn('_india_new_raster1_tiled_3','geom');

drop table _india_new_raster1_tiled_0;
drop table _india_new_raster1_tiled_1;
drop table _india_new_raster1_tiled_2;
drop table _india_new_raster1_tiled_3;

DELETE FROM cesium_mosaic WHERE name = '_india_new_raster1' AND tiletable = '_india_new_raster1_tiled_0' AND spatialtable = '_india_new_raster1_tiled_0'  ;
DELETE FROM cesium_mosaic WHERE name = '_india_new_raster1' AND tiletable = '_india_new_raster1_tiled_1' AND spatialtable = '_india_new_raster1_tiled_1'  ;
DELETE FROM cesium_mosaic WHERE name = '_india_new_raster1' AND tiletable = '_india_new_raster1_tiled_2' AND spatialtable = '_india_new_raster1_tiled_2'  ;
DELETE FROM cesium_mosaic WHERE name = '_india_new_raster1' AND tiletable = '_india_new_raster1_tiled_3' AND spatialtable = '_india_new_raster1_tiled_3'  ;
