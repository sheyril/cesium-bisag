(function() {
    const Cesium = require('cesium/Cesium');
    require('cesium/Widgets/widgets.css');

    let viewer = new Cesium.Viewer('cesiumContainer');

    viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
    let prov = new Cesium.WebMapServiceImageryProvider({
            url : 'http://localhost:8585/geoserver/nurc/wms',
            layers: 'nurc:Img_Sample',
            parameters: {
                service: 'WMS',
                version: '1.1.1',
                request: 'GetMap',
                format: 'image/jpeg'
            }
    });
    viewer.imageryLayers.addImageryProvider(prov);

    let tp = new Cesium.CesiumTerrainProvider({
        url : 'http://localhost:9000/tilesets/tiles',
        requestVertexNormals : true
    });
    viewer.terrainProvider = tp;

    var geojsonOptions = {
        clampToGround : true
    };
    // Load neighborhood boundaries from a GeoJson file
    // Data from : https://data.cityofnewyork.us/City-Government/Neighborhood-Tabulation-Areas/cpf4-rkhq
    var neighborhoodsPromise = Cesium.GeoJsonDataSource.load('http://localhost:8585/myFile', geojsonOptions);
    neighborhoodsPromise.then((dataSource) => {
        viewer.dataSources.add(dataSource)
    }).otherwise((e) =>  {
            console.log('error found: ', e);
        });
})();
