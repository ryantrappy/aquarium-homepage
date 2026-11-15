import json,struct,zlib
from pathlib import Path

def pixels(file):
    data=Path(file).read_bytes();offset=8;encoded=[]
    while offset<len(data):
        n=struct.unpack_from('>I',data,offset)[0];kind=data[offset+4:offset+8];payload=data[offset+8:offset+8+n];offset+=12+n
        if kind==b'IHDR':width,height,depth,color,compression,filtering,interlace=struct.unpack('>IIBBBBB',payload)
        if kind==b'IDAT':encoded.append(payload)
    assert (depth,color,compression,filtering,interlace)==(8,2,0,0,0)
    raw=zlib.decompress(b''.join(encoded));stride=width*3;rows=[];previous=bytearray(stride)
    for y in range(height):
        start=y*(stride+1);kind=raw[start];row=bytearray(raw[start+1:start+1+stride])
        for x in range(stride):
            a=row[x-3] if x>=3 else 0;b=previous[x];c=previous[x-3] if x>=3 else 0
            if kind==0:predict=0
            elif kind==1:predict=a
            elif kind==2:predict=b
            elif kind==3:predict=(a+b)//2
            elif kind==4:
                p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c);predict=a if pa<=pb and pa<=pc else b if pb<=pc else c
            else:raise ValueError('Unknown PNG filter')
            row[x]=(row[x]+predict)&255
        rows.append(row);previous=row
    return width,height,rows

roi=(600,150,1200,600);results={}
for name in ['key-production.png','key-reversed.png']:
    width,height,rows=pixels(Path(__file__).resolve().parent / 'native' / name);sums=[0,0,0];count=0
    for y in range(roi[1],roi[3]):
        for x in range(roi[0],roi[2]):
            for channel in range(3):sums[channel]+=rows[y][x*3+channel]
            count+=1
    means=[v/count for v in sums];results[name]={'imageSize':[width,height],'samplePixels':count,'meanEncodedRgb0To255':means,'meanEncodedLuma0To255':sum(a*b for a,b in zip(means,[.2126,.7152,.0722]))}
print(json.dumps({'roiCssPixels':roi,'interpretation':'Display code values, not physical radiance. Same frozen water-only diagnostic/camera; only diagnostic key direction reversed. UI excluded.','results':results},indent=2))
