import os;
import glob;
import shutil;
from pathlib import Path;

def gdalRetile(infilepath, layerName, targetDir, levels='2', srid='EPSG:4326', tileDim='1024'):
    p = Path(targetDir);
    q = p / '*';
    print(q);
    for root, dirs, files in os.walk(str(p)):
        for f in files:
            os.unlink(os.path.join(root, f))
        for d in dirs:
            shutil.rmtree(os.path.join(root, d))
    os.system('gdal_retile.py -r bilinear -co "TFW=YES" -ps ' + tileDim + ' ' + tileDim + ' -s_srs ' + srid + ' -of GTiff -ot Byte -levels ' + levels + ' -targetDir ' + targetDir + ' ' + infilepath);

def createMetaTables(jsonLayerObject):
    for()
