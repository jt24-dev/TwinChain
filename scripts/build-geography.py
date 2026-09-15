"""Build local SVG geography from Natural Earth GeoJSON; Python standard library only.
Usage: python3 scripts/build-geography.py countries.geojson places.geojson
Source: https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
Natural Earth is public domain. Inputs are build-time data, never fetched at runtime.
"""
import json, sys, math, hashlib
from pathlib import Path

def project(lon, lat):
    return [round((lon + 30) / 360 * 1100, 3), round((90 - lat) / 180 * 550, 3)]

def clip(points, boundary, greater):
    result=[]
    for a,b in zip(points[-1:]+points[:-1],points):
        inside_a=(a[0]>=boundary) if greater else (a[0]<=boundary)
        inside_b=(b[0]>=boundary) if greater else (b[0]<=boundary)
        if inside_a != inside_b:
            t=(boundary-a[0])/(b[0]-a[0])
            result.append([boundary,a[1]+t*(b[1]-a[1])])
        if inside_b: result.append(b)
    return result

countries=[]
for f in json.load(open(sys.argv[1]))['features']:
    p=f['properties']; geometry=f['geometry']; paths=[]
    polygons=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
    for polygon in polygons:
        for ring in polygon:
            unwrapped=[]
            for lon,lat,*_ in ring:
                if unwrapped and abs(lat)<89.99:
                    while lon-unwrapped[-1][0]>180: lon-=360
                    while lon-unwrapped[-1][0]<-180: lon+=360
                unwrapped.append([lon,lat])
            for shift in [-720,-360,0,360,720]:
                points=clip(clip([[x+shift,y] for x,y in unwrapped],-30,True),330,False)
                if len(points)<3: continue
                screen=[project(*pt) for pt in points]
                paths.append('M'+'L'.join(f'{x},{y}' for x,y in screen)+'Z')
    lon=((p['LABEL_X']+30)%360)-30
    name='United States' if p['NAME']=='United States of America' else p['NAME']
    countries.append({'id':str(p['NE_ID']),'name':name,'point':project(lon,p['LABEL_Y']), 'rank':p['LABELRANK'],'path':''.join(paths)})
places=[]
for f in json.load(open(sys.argv[2]))['features']:
    p=f['properties'];lon,lat=f['geometry']['coordinates'][:2]
    places.append({'name':p.get('NAME') or p.get('name'),'point':project(((lon+30)%360)-30,lat),'rank':p.get('SCALERANK',p.get('scalerank',9))})
Path('lib/data/geography.json').write_text(json.dumps({'countries':countries,'places':places},separators=(',',':')))
print(f'{len(countries)} countries/territories, {len(places)} places; {Path("lib/data/geography.json").stat().st_size} bytes')
print('Country source SHA256:',hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest())
