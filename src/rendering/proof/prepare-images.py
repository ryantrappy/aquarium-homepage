from PIL import Image, ImageDraw
import cv2
import numpy as np
from pathlib import Path
here=Path(__file__).parent
for name,points in [
 ('ocellaris-clownfish',[(328,137),(342,126),(360,123),(383,128),(404,145),(424,161),(440,177),(432,193),(412,207),(388,218),(364,218),(343,207),(329,186),(324,161)]),
 ('yellow-tang',[(348,188),(361,190),(375,201),(391,214),(407,225),(424,242),(429,253),(416,265),(403,270),(390,268),(377,260),(363,245),(350,228)])
]:
 image=Image.open(here.parent.parent.parent / 'public' / 'fish' / (name+'.webp')).convert('RGBA')
 mask=Image.new('L',image.size,0); ImageDraw.Draw(mask).polygon(points,fill=255)
 rgba=np.array(image); m=np.array(mask)
 # Original fins remain separate to allow a controlled, explicitly observable flap.
 fin=rgba.copy(); fin[:,:,3]=np.minimum(fin[:,:,3],m)
 Image.fromarray(fin).save(here/(name+'-fin.png'))
 body=rgba.copy(); body[:,:,:3]=cv2.inpaint(rgba[:,:,:3],m,7,cv2.INPAINT_TELEA)
 Image.fromarray(body).save(here/(name+'-body.png'))
