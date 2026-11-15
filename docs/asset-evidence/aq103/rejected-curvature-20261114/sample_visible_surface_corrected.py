#!/usr/bin/env python3
"""Corrected analytic AQ103 visibility/NoV sweep for overview camera.
Includes x in the actual camera vector/distance and optional vertex wave height.
It samples continuous shader equations, not rasterized PlaneGeometry interpolation.
"""
import json, math
CAM_X,CAM_Y,CAM_Z=0.0,.15,9.0
SURFACE_Y,FOV_DEG,HEIGHT=4.4,42.0,900
BACK_Z,FRONT_Z,HALF_WIDTH=-5.48,2.84,6.0
waves=[(1,0,3.6,.014,.7),(.6,.8,3,.01,2.1),(0,1,.9,.005,4),(-.8,.6,.65,.004,1.3)]
D=[(dx,dz,a,2*math.pi/w,math.sqrt(9.81*2*math.pi/w),ph) for dx,dz,w,a,ph in waves]
normalizer=sum(a*k*k for dx,dz,a,k,o,p in D)
def field(x,z,t):
    h=sx=sz=f=0.0
    for dx,dz,a,k,o,ph in D:
        u=(x*dx+z*dz)*k-o*t+ph
        h+=a*math.sin(u)
        c=a*k*math.cos(u); sx+=c*dx; sz+=c*dz; f+=a*k*k*math.sin(u)
    return h,sx,sz,f/normalizer
def capillary(x,z,t):
    u1x=x*1.35+t*.42;u1y=z*1.85-t*.31
    u2x=x*2.40-t*.55;u2y=z*3.10+t*.48
    u3x=x*.75+t*.22;u3y=z*1.10+t*.29
    return (math.cos(u1x+.65*math.sin(u1y))*.06 + math.sin(u2x-.55*math.cos(u2y))*.03 + math.cos(u3x+u3y*.5)*.045,
            math.cos(u1y+.65*math.sin(u1x))*.06 + math.cos(u2y+.55*math.sin(u2x))*.03 + math.sin(u3y-u3x*.5)*.045)
def smooth(a,b,x):
    q=max(0,min(1,(x-a)/(b-a)));return q*q*(3-2*q)
z_top=CAM_Z-(SURFACE_Y-CAM_Y)/math.tan(math.radians(FOV_DEG/2))
focal_px=HEIGHT/(2*math.tan(math.radians(FOV_DEG/2)))
visible_z=BACK_Z+(z_top-BACK_Z)
rows={'flat':[],'wave-displaced':[]}
for iz in range(50):
    z=BACK_Z+(z_top-BACK_Z)*iz/49
    for ix in range(81):
        x=-HALF_WIDTH+2*HALF_WIDTH*ix/80
        for it in range(60):
            t=it*.5
            h,sx,sz,focus=field(x,z,t);cx,cz=capillary(x,z,t)
            detailDistFlat=math.sqrt(x*x+(SURFACE_Y-CAM_Y)**2+(CAM_Z-z)**2)
            detailDistWave=math.sqrt(x*x+(SURFACE_Y+1.15*h-CAM_Y)**2+(CAM_Z-z)**2)
            for mode,sy,dist in [('flat',SURFACE_Y,detailDistFlat),('wave-displaced',SURFACE_Y+1.15*h,detailDistWave)]:
                fade=1-smooth(5.5,15.5,dist)
                macro=2.6*(.28+.72*fade)
                tx=sx*macro+cx*fade;tz=sz*macro+cz*fade
                nlen=math.sqrt(tx*tx+1+tz*tz)
                vx=CAM_X-x;vy=CAM_Y-sy;vz=CAM_Z-z
                vlen=math.sqrt(vx*vx+vy*vy+vz*vz)
                nov=max(0,min(1,(tx*vx-vy+tz*vz)/(nlen*vlen)))
                window=smooth(.53,.76,nov+max(focus,0)*.07)
                rows[mode].append((nov,window,fade))
def summary(items,index):
    v=sorted(row[index] for row in items)
    return {'min':v[0],'p50':v[len(v)//2],'p95':v[int(.95*len(v))],'max':v[-1]}
result={'units':'legacy scene units; not a physical metre calibration','camera':{'position':[CAM_X,CAM_Y,CAM_Z],'target':[0,CAM_Y,0],'fovDeg':FOV_DEG,'viewport':[1440,HEIGHT]},'surface':{'surfaceY':SURFACE_Y,'glassBounds':{'backZ':BACK_Z,'frontZ':FRONT_Z,'halfWidth':HALF_WIDTH}},'visibility':{'topFrustumIntersectionZ':z_top,'visibleZ':[BACK_Z,z_top],'visibleDepthUnits':z_top-BACK_Z,'totalDepthUnits':FRONT_Z-BACK_Z,'visibleDepthPercent':100*(z_top-BACK_Z)/(FRONT_Z-BACK_Z),'visibleStripHeightPx':HEIGHT/2-focal_px*math.tan(math.atan2(SURFACE_Y-CAM_Y,CAM_Z-BACK_Z))},'sweep':{'timeSeconds':[0,29.5,.5],'samplesPerMode':len(rows['flat']),'equations':'current surfaceWaveHeight/slope/focus, current capillarySlope, detailFade, normal and camera dot; continuous field sampled before raster interpolation','flatPlane':{'NoV':summary(rows['flat'],0),'SnellWindow':summary(rows['flat'],1),'detailFade':summary(rows['flat'],2),'windowPositiveFraction':sum(r[1]>0 for r in rows['flat'])/len(rows['flat'])},'waveDisplaced':{'NoV':summary(rows['wave-displaced'],0),'SnellWindow':summary(rows['wave-displaced'],1),'detailFade':summary(rows['wave-displaced'],2),'windowPositiveFraction':sum(r[1]>0 for r in rows['wave-displaced'])/len(rows['wave-displaced'])}},'limitations':['Continuous shader field is sampled, not exact per-fragment interpolation from 96x48 displaced mesh vertices.','Finite x/z/time sweep, not an analytic global bound.','Visibility intersection assumes overview camera is level and horizontal as in source.']}
print(json.dumps(result,indent=2))
