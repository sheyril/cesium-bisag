#PROJECT TITLE
Experimentations with terrain elevation data for generating and serving 3D Tilesets


##DESCRIPTION
This tool allows the user to visualise 2D height maps in 3D using the CesiumJS library. 

##PREREQUISITES

GeoServer v2.15.1
QGIS v3.4
pgAdmin4
PostgreSQL v9.6
PostGIS v2.3.9
Docker 
Go
[Cesium Terrain Builder](https://github.com/geo-data/cesium-terrain-builder)
[Cesium Terrain Server](https://github.com/geo-data/cesium-terrain-server)
Node Package Manager (NPM)
JDBC Image Mosaic Plugin extention (compatible with the GeoServer version)

###Prerequisites Installation Guide:

Exract the JDBC Image Mosaic plugin zip contents into the directory geoserver-2.15.1/webapps/geoserver/WEB-INF/lib 
Install Cesium Terrain Builder and Cesium Terrain Server using Docker
Cesium Terrain Builder requirements:
	gdal version>=**2.0.0** installed on system
	gdal source developement header files
	Cmake should be available on the system

Cesium Terrain server requirements:
	system should have [Go](https://golang.org/) installed as the server is written in Go


Setting up the terrain files for serving,

If the folder system is like this:

	/data/files/
	├── rasters
	│   └── DEM.tif
	└── tilesets
	    └── terrain 

To create terrain tiles from DEM files, 
	1. To load cesium terrain builder in docker, in the bash shell run:
		`docker run -t -i homme/cesium-terrain-builder:latest /bin/bash`

	2. To check that the cesium terrain builder has been sucessfully loaded, run:
		`ctb-tile --version`

	3. To mount data from host directory in the docker container, run:
		`docker run -v /data/files:/data -t -i homme/cesium-terrain-builder:latest bash`

		Here, the host directory **/data/files** is mapped to to **/data** in the container.

	4. To tile the file **/data/rasters/DEM.tif**, run the command:
		`ctb-tile --output-dir /data/tilesets/terrain/test /data/rasters/DEM.tif`

		You will find various .terrain files in the directory: **/data/tilesets/terrain/test**

To run the cesium terrain server to visualise the terrain tiles, run:

	`docker run -p 8080:8000 -v /data/docker/tilesets/terrain:/data/tilesets/terrain \
    geodata/cesium-terrain-server`

    Enter <http://localhost:8080/> in the web browser to visualise the served terrain using Cesium.

For bugs or issues, go to:  [Cesium Terrain Builder](https://github.com/geo-data/cesium-terrain-builder)
													or 
							[Cesium Terrain Server](https://github.com/geo-data/cesium-terrain-server)


##INSTALLATION

Download the source code from: [Cesium-BISAG](https://github.com/narang99/cesium-bisag)

##USAGE



