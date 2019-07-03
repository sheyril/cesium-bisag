## NOTE: Module is always directly called by the express server
from qgis.core import *;
import PyQt5.QtCore;
import PyQt5.QtGui;
from PyQt5.QtGui import QColor;

from qgis.analysis import QgsNativeAlgorithms;
import sys;

#sys.argv store the arguments, first argument is file name that was run
#convention: argv[1]:processName, then all the parameters in order defined in function

#Wrapper is made as exitQgis() was causing problems with processing functions

class QGISwrapper:
    def __init__(self):
        QgsApplication.setPrefixPath("/usr", True);
        self.qgs = QgsApplication([], False);

    def startApplication(self):
        self.qgs.initQgis();

    def endApplication(self):
        self.qgs.exitQgis();

    def generateContour(self, inp, outp, bandNumber, interval):
        ## NOTE: initQgis, exitQgis can be taken out and the function can be used in sync with startApplication and endApplication
        # self.qgs.initQgis();
        sys.path.append('/usr/share/qgis/python/plugins/')
        import processing
        from processing.core.Processing import Processing
        Processing.initialize();
        QgsApplication.processingRegistry().addProvider(QgsNativeAlgorithms());
        processing.run("gdal:contour", { 'INPUT':inp,'BAND':bandNumber,'INTERVAL':interval,'FIELD_NAME':'ELEV','CREATE_3D':False,'CREATE_3D':False,'IGNORE_NODATA':False,'NODATA':None,'OFFSET':0,'OPTIONS':'','OUTPUT':outp});
        # self.qgs.exitQgis();

    def convertRasterToPointVector(self, inp, outp, bandNumber):
        # self.qgs.initQgis();
        sys.path.append('/usr/share/qgis/python/plugins/')
        import processing
        from processing.core.Processing import Processing
        Processing.initialize();
        QgsApplication.processingRegistry().addProvider(QgsNativeAlgorithms());
        processing.run("native:pixelstopoints", {'INPUT_RASTER':inp,'RASTER_BAND':bandNumber,'FIELD_NAME':'VALUE','OUTPUT':outp});
        # self.qgs.exitQgis();
        print('contour');

    ## NOTE: recheck value for pixel size
    def interpolateVector(self, inp, outp, minx, maxx, miny, maxy, srid, pixelSize=0.000587):
        extent = '' + minx + ',' + maxx + ',' + miny + ',' + maxy + ' [' + srid + ']';
        processing.run("qgis:tininterpolation", {'INTERPOLATION_DATA':inp + '::~::0::~::0::~::0','METHOD':0,'EXTENT': extent,'PIXEL_SIZE':pixelSize,'OUTPUT':outp});

    def generateHillShade(self, inp, outp):
        # self.qgs.initQgis();
        sys.path.append('/usr/share/qgis/python/plugins/')
        import processing
        from processing.core.Processing import Processing
        Processing.initialize();
        QgsApplication.processingRegistry().addProvider(QgsNativeAlgorithms());
        processing.run("gdal:hillshade", {'INPUT':inp,'BAND':1,'Z_FACTOR':1.571e-05,'SCALE':1,'AZIMUTH':315,'ALTITUDE':40,'COMPUTE_EDGES':False,'ZEVENBERGEN':False,'COMBINED':False,'MULTIDIRECTIONAL':False,'OPTIONS':'','OUTPUT':outp})
        # self.qgs.exitQgis();
        # print('hillshade')

    def generatePseudoColor(self,inp,outp):
        #applying pseudocolor style
        # self.qgs.initQgis();
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
        # self.qgs.exitQgis();

    def prepareContours(self,tilesFolder, outputFolder, layerName, srid, bands, intervals):
        from pathlib import Path;
        import glob;
        p = Path(tilesFolder);
        q = p / '*.tif';
        allRasters = glob.glob(str(q));
        for interval in intervals:
            for rasterPath in range(0, len(allRasters)):
                layer  = QgsRasterLayer(allRasters[rasterPath], 'abc');
                extent = layer.extent();
                xMin = extent.xMinimum();
                yMin = extent.yMinimum();
                xMax = extent.xMaximum();
                yMax = extent.yMaximum();
                outLayerName = '_' + str(interval) + '_' + str(xMin) + '_' + str(xMax) + '_' + str(yMin) + '_' + str(yMax) + '_' + layerName + '.shp';
                outLayerPath = Path(outputFolder) / outLayerName;
                print(str(outLayerPath));
                self.generateContour(allRasters[rasterPath], str(outLayerPath), bands, interval);

    # def prepareMultipleLayersContours(self, )

method = sys.argv[1];
myQgs = QGISwrapper();
myQgs.startApplication();
# myQgs.prepareContour("/home/orange/Desktop/3D_DEM_DATA/tiles", "/home/orange/Desktop/3D_DEM_DATA/allShp", "myContours", 'EPSG:4326', 1, 100);

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
elif method == "prepareContour":
    print('hey');
    inpfold = sys.argv[2];
    outpfold = sys.argv[3];
    lName = sys.argv[4];
    srid = sys.argv[5];
    bands = sys.argv[6];

    # print(len(sys.argv));
    length = len(sys.argv);
    intervals = [];
    for i in range(7, length):
        intervals.append(int(sys.argv[i]));
    myQgs.prepareContours(inpfold, outpfold, lName, srid, bands, intervals);

myQgs.endApplication();
