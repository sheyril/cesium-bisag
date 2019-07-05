#Everything is stable here
from qgis.core import *;
import PyQt5.QtCore;
import PyQt5.QtGui;
from PyQt5.QtGui import QColor;

from qgis.analysis import QgsNativeAlgorithms;
import sys;
from pathlib import Path;
import glob;

class QGISwrapper:
    def __init__(self):
        QgsApplication.setPrefixPath("/usr", True);
        self.qgs = QgsApplication([], False);

    def startApplication(self):
        self.qgs.initQgis();

    def endApplication(self):
        self.qgs.exitQgis();

    def generateContour(self, inp, outp, bandNumber, interval):
        sys.path.append('/usr/share/qgis/python/plugins/')
        import processing
        from processing.core.Processing import Processing
        Processing.initialize();
        QgsApplication.processingRegistry().addProvider(QgsNativeAlgorithms());
        processing.run("gdal:contour", { 'INPUT':inp,'BAND':bandNumber,'INTERVAL':interval,'FIELD_NAME':'ELEV','CREATE_3D':False,'CREATE_3D':False,'IGNORE_NODATA':False,'NODATA':None,'OFFSET':0,'OPTIONS':'','OUTPUT':outp});

    def convertRasterToPointVector(self, inp, outp, bandNumber):
        sys.path.append('/usr/share/qgis/python/plugins/')
        import processing
        from processing.core.Processing import Processing
        Processing.initialize();
        QgsApplication.processingRegistry().addProvider(QgsNativeAlgorithms());
        processing.run("native:pixelstopoints", {'INPUT_RASTER':inp,'RASTER_BAND':bandNumber,'FIELD_NAME':'VALUE','OUTPUT':outp});
        print('contour');

    ## NOTE: recheck value for pixel size
    def interpolateVector(self, inp, outp, minx, maxx, miny, maxy, srid, pixelSize=0.000587):
        extent = '' + minx + ',' + maxx + ',' + miny + ',' + maxy + ' [' + srid + ']';
        processing.run("qgis:tininterpolation", {'INTERPOLATION_DATA':inp + '::~::0::~::0::~::0','METHOD':0,'EXTENT': extent,'PIXEL_SIZE':pixelSize,'OUTPUT':outp});

    def generateHillShade(self, inp, outp):
        sys.path.append('/usr/share/qgis/python/plugins/')
        import processing
        from processing.core.Processing import Processing
        Processing.initialize();
        QgsApplication.processingRegistry().addProvider(QgsNativeAlgorithms());
        processing.run("gdal:hillshade", {'INPUT':inp,'BAND':1,'Z_FACTOR':1.571e-05,'SCALE':1,'AZIMUTH':315,'ALTITUDE':40,'COMPUTE_EDGES':False,'ZEVENBERGEN':False,'COMBINED':False,'MULTIDIRECTIONAL':False,'OPTIONS':'','OUTPUT':outp})

    def generatePseudoColor(self,inp,outp):
        rlayer = QgsRasterLayer(inp, "pseudocolor_layer")
        provider = rlayer.dataProvider()
        extent = rlayer.extent();
        print(extent);
        print(rlayer.dataProvider());
        stats = provider.bandStatistics(1, QgsRasterBandStats.All, extent, 0)
        max = stats.maximumValue
        min = stats.minimumValue
        interval = (max-min)/4
        sum = min
        classlist=[]
        for i in range(4):
            classlist.append(sum)
            sum += interval
        classlist.append(max);
        print(classlist);
        fcn = QgsColorRampShader()
        fcn.setColorRampType(QgsColorRampShader.Interpolated)
        lst = [QgsColorRampShader.ColorRampItem(classlist[0], QColor(215,25,28)), QgsColorRampShader.ColorRampItem(classlist[1], QColor(253,174,97)), QgsColorRampShader.ColorRampItem(classlist[2], QColor(255,255,191)), QgsColorRampShader.ColorRampItem(classlist[3], QColor(171,221,164)), QgsColorRampShader.ColorRampItem(classlist[4], QColor(43,131,186)) ]
        fcn.setColorRampItemList(lst)
        shader = QgsRasterShader()
        shader.setRasterShaderFunction(fcn)
        renderer = QgsSingleBandPseudoColorRenderer(rlayer.dataProvider(), 1, shader)
        rlayer.setRenderer(renderer)
        rlayer.triggerRepaint()
        width, height = rlayer.width(), rlayer.height()
        renderer = rlayer.renderer()
        provider=rlayer.dataProvider()
        crs = rlayer.crs().toWkt()
        pipe = QgsRasterPipe()
        pipe.set(provider.clone())
        pipe.set(renderer.clone())
        file_writer = QgsRasterFileWriter(outp)
        file_writer.writeRaster(pipe, width, height, extent, rlayer.crs())

    def ContoursUsingClip(self, inpLayer, outputFolder, layerName, bands, interval, tileSize):
        import os;
        layer = QgsRasterLayer(inpLayer);
        self.generateContour(inpLayer, './temporaryFiles/tiles/test.shp', bands, interval);
        pixelSizeX = layer.rasterUnitsPerPixelX();
        pixelSizeY = layer.rasterUnitsPerPixelY();
        extent = layer.extent();
        xMin = extent.xMinimum();
        yMin = extent.yMinimum();
        xMax = extent.xMaximum();
        yMax = extent.yMaximum();
        p = Path(outputFolder);
        x = xMin;
        while x < xMax:
            nextX = x + pixelSizeX*tileSize;
            if(nextX > xMax):
                nextX = xMax;
            y = yMin;
            while y < yMax:
                nextY = y + pixelSizeY*tileSize;
                if(nextY > yMax):
                    nextY = yMax;
                outLayerName = '_' + str(interval) + '_' + str(x) + '_' + str(nextX) + '_' + str(y) + '_' + str(nextY)  + '_' + layerName + '.shp';
                outLayerPath = p / outLayerName;
                outLayerPath = str(outLayerPath);
                os.system('ogr2ogr -f \"ESRI Shapefile\" -clipsrc ' + str(x) + ' ' + str(y) + ' ' + str(nextX) + ' ' + str(nextY) + ' ' + outLayerPath + ' ./temporaryFiles/tiles/test.shp');
                y = nextY;
            x = nextX;
    # if(os.path.exists('./temporaryFiles/tiles/test.shp'))


method = sys.argv[1];
myQgs = QGISwrapper();
myQgs.startApplication();

if method == "contour":
    inp = sys.argv[2];
    outp = sys.argv[3];
    bands = float(sys.argv[4]);
    interval = float(sys.argv[5]);
    myQgs.generateContour(inp, outp, bands, interval);
    print('yay');
elif method == "hillshade":
    inp = sys.argv[2];
    outp = sys.argv[3];
    myQgs.generateHillShade(inp, outp);
    print('hill');
elif method == "pseudocolor":
    inp = sys.argv[2];
    outp = sys.argv[3];
    myQgs.generatePseudoColor(inp, outp);
elif method == "prepareTiledContours":
    import json;
    f = open(sys.argv[2], "r");
    data = f.read();
    jsonObject = json.loads(data);
    print(jsonObject);
    inplayer = str(jsonObject['layer']['inputLayerPath']);
    outpfold = str(jsonObject['layer']['outLayerDirectoryPath']);
    lName = str(jsonObject['layer']['layerName']);
    bands = int(jsonObject['layer']['bands']);
    intervals = jsonObject['layer']['intervals'];
    tileSizes = jsonObject['layer']['tileSizes'];
    for i in range(0, len(intervals)):
        myQgs.ContoursUsingClip(inplayer, outpfold, lName, bands, int(intervals[i]), int(tileSizes[i]));

myQgs.endApplication();
