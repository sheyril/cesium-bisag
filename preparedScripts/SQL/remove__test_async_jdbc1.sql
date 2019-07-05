
drop index IX__test_async_jdbc1_tiled_0;
drop index IX__test_async_jdbc1_tiled_1;
drop index IX__test_async_jdbc1_tiled_2;
drop index IX__test_async_jdbc1_tiled_3;

select DropGeometryColumn('_test_async_jdbc1_tiled_0','geom');
select DropGeometryColumn('_test_async_jdbc1_tiled_1','geom');
select DropGeometryColumn('_test_async_jdbc1_tiled_2','geom');
select DropGeometryColumn('_test_async_jdbc1_tiled_3','geom');

drop table _test_async_jdbc1_tiled_0;
drop table _test_async_jdbc1_tiled_1;
drop table _test_async_jdbc1_tiled_2;
drop table _test_async_jdbc1_tiled_3;

DELETE FROM cesium_mosaic WHERE name = '_test_async_jdbc1' AND tiletable = '_test_async_jdbc1_tiled_0' AND spatialtable = '_test_async_jdbc1_tiled_0'  ;
DELETE FROM cesium_mosaic WHERE name = '_test_async_jdbc1' AND tiletable = '_test_async_jdbc1_tiled_1' AND spatialtable = '_test_async_jdbc1_tiled_1'  ;
DELETE FROM cesium_mosaic WHERE name = '_test_async_jdbc1' AND tiletable = '_test_async_jdbc1_tiled_2' AND spatialtable = '_test_async_jdbc1_tiled_2'  ;
DELETE FROM cesium_mosaic WHERE name = '_test_async_jdbc1' AND tiletable = '_test_async_jdbc1_tiled_3' AND spatialtable = '_test_async_jdbc1_tiled_3'  ;
