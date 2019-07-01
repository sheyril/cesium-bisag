/*
    File structure for geoserver:
    workspace baseRasters: includes all baseImagery GeoTiff Files
    workspace contours: includes contours for respective bacImagery
    and so on for other types of reliefs
*/
(function() {
    const Cesium = require('cesium/Cesium');
    require('cesium/Widgets/widgets.css');

    let viewer = new Cesium.Viewer('cesiumContainer');

    let expressProxyBaseUrl = 'http://localhost:8585/';
    let geoserverBaseUrl = 'http://localhost:8080/';

    viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
    let prov = new Cesium.WebMapServiceImageryProvider({
            url : geoserverBaseUrl+'geoserver/Rasters/wms',
            layers: 'Rasters:_india_colored',
            parameters: {
                service: 'WMS',
                version: '1.1.1',
                request: 'GetMap',
                format: 'image/jpeg',
                tiled: true
            }
    });
    viewer.imageryLayers.addImageryProvider(prov);

    let tp = new Cesium.CesiumTerrainProvider({
        url : 'http://localhost:9000/tilesets/tiles',
        requestVertexNormals : true
    });
    viewer.terrainProvider = tp;

    // let geojsonOptions = {
    //     clampToGround : true,
    //     stroke: Cesium.Color.BLACK,
    //     fill: Cesium.Color.BLACK
    // };
    //
    // console.log(viewer.imageryLayers.get(0));
    // viewer.flyTo(viewer.imageryLayers.get(0));

    // let jsonUrlOptions = {
    //     workspace: 'cite',
    //     service: 'WFS',
    //     version: '1.0.0',
    //     request: 'GetFeature',
    //     typeName: 'cite:_22_93', //layername
    //     outputFormat: 'application/json'
    // };
    //
    // let myJsonUrl = 'http://localhost:8080/geoserver/' + jsonUrlOptions.workspace + '/ows?service=' + jsonUrlOptions.service + '&version=' +jsonUrlOptions.version + '&request=' + jsonUrlOptions.request + '&typeName=' + jsonUrlOptions.typeName + '&outputFormat=' + jsonUrlOptions.outputFormat;
    // let contourPromise = Cesium.GeoJsonDataSource.load(myJsonUrl, geojsonOptions);
    //
    // contourPromise.then((dataSource) => {
    //     viewer.dataSources.add(dataSource);
    // })
    // .otherwise((e) =>  {
    //     let vectorUrl = expressProxyBaseUrl+ 'geoserver/generate/contours?layers=' + jsonUrlOptions.typeName.split(':')[1] + '&workspace=Contours'+ '&format=text&bands=1&interval=100';
    //     console.log(vectorUrl);
    //     fetch(vectorUrl, {
    //         method: 'GET',
    //         mode: 'cors',
    //         headers: {
    //             'Accept' : 'text/plain'
    //         }
    //     })
    //     .then(response => {
    //         if(response.ok) {
    //             return response.text()
    //         }
    //     })
    //     .then(text => {
    //         jsonUrlOptions.workspace = text.split(':')[0];
    //         jsonUrlOptions.typeName = text;
    //         myJsonUrl = 'http://localhost:8080/geoserver/' + jsonUrlOptions.workspace + '/ows?service=' + jsonUrlOptions.service + '&version=' +jsonUrlOptions.version + '&request=' + jsonUrlOptions.request + '&typeName=' + jsonUrlOptions.typeName + '&outputFormat=' + jsonUrlOptions.outputFormat;
    //         return contourPromise = Cesium.GeoJsonDataSource.load(myJsonUrl, geojsonOptions)
    //     })
    //     .then(dataSource => {
    //         viewer.dataSources.add(dataSource);
    //     })
    //     .otherwise(err => {
    //         console.log(err);
    //     })
    //     .catch(err => {
    //         console.log(err);
    //         console.log('sorry');
    //     });
    // });
    //
    // viewer.canvas.addEventListener('click', function(e) {
    //     var mousePosition = new Cesium.Cartesian2(e.clientX, e.clientY);
    //     var ellipsoid = viewer.scene.globe.ellipsoid;
    //     var cartesian = viewer.camera.pickEllipsoid(mousePosition, ellipsoid);
    //     if (cartesian) {
    //         var cartographic = ellipsoid.cartesianToCartographic(cartesian);
    //         var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
    //         var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
    //         alert(longitudeString + ', ' + latitudeString);
    //     } else {
    //         alert('Globe was not picked');
    //     }
    // }, false);
    //to facilitate loading of contours dynamically, keep a temp url as base directory, make request to server
    //server returns an array of names for the json files
    //to make it asynchronous, call a recursive function instead of looping
    //do this is got 404 status from geoserver, that is not ok status
    //promises doesnt resolve if data is not loaded
    //now ask the proxy server for the geojson files
    //the proxy server in turn would update database to add the contour files
    //If user wants to set parameters, then use this by default
})();
