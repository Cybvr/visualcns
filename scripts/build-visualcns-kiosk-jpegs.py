"""Build VisualCNS kiosk concept sheets and JPEG copies of the 3D renders.

Drawings are dimensioned in millimetres. Visual scale is for review only.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "visualcns-kiosks"
OUT.mkdir(parents=True, exist_ok=True)
LOGO = Image.open(ROOT / "public" / "visualcns-email-logo.png").convert("RGB")
GEN = Path(r"C:\Users\JidePinheiro\.codex\generated_images\01a100c5-ada1-7131-a3af-ecf88b8608c1")

NAVY = "#14283d"
BLUE = "#1547f5"
MID = "#6a7d90"
LIGHT = "#edf2f6"
CHARCOAL = "#30363e"
W = 2600
H = 1900


def f(size: int, bold: bool = False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)


def txt(d, xy, value, size=24, color=NAVY, bold=False, anchor=None):
    d.text(xy, value, fill=color, font=f(size, bold), anchor=anchor)


def dim_h(d, x1, x2, y, ext_y, label):
    c = MID
    d.line((x1, ext_y, x1, y + 12), fill=c, width=2)
    d.line((x2, ext_y, x2, y + 12), fill=c, width=2)
    d.line((x1, y, x2, y), fill=c, width=2)
    d.polygon([(x1, y), (x1 + 15, y - 6), (x1 + 15, y + 6)], fill=c)
    d.polygon([(x2, y), (x2 - 15, y - 6), (x2 - 15, y + 6)], fill=c)
    txt(d, ((x1 + x2) / 2, y - 18), label, 27, anchor="ms")


def dim_v(d, y1, y2, x, ext_x, label):
    c = MID
    d.line((ext_x, y1, x - 12, y1), fill=c, width=2)
    d.line((ext_x, y2, x - 12, y2), fill=c, width=2)
    d.line((x, y1, x, y2), fill=c, width=2)
    d.polygon([(x, y1), (x - 6, y1 + 15), (x + 6, y1 + 15)], fill=c)
    d.polygon([(x, y2), (x - 6, y2 - 15), (x + 6, y2 - 15)], fill=c)
    txt(d, (x + 18, (y1 + y2) / 2), label, 27, anchor="lm")


def paste_logo(im, box):
    x, y, w = box
    h = round(w / LOGO.width * LOGO.height)
    logo = LOGO.resize((w, h), Image.Resampling.LANCZOS)
    im.paste(logo, (x, y))


def draw_screen(im, d, x1, y1, x2, y2):
    d.rounded_rectangle((x1, y1, x2, y2), radius=9, fill="#f8fafd", outline=NAVY, width=5)
    width = x2 - x1
    center = (x1 + x2) / 2
    # Exact logo from the user's asset, reduced to fit the technical front view.
    paste_logo(im, (round(center - width * .37), round(y1 + 24), round(width * .74)))
    txt(d, (center, y1 + (y2 - y1) * .36), "Visitor Sign-in", 24, NAVY, True, "mm")
    for yy, title in [(.48, "Full Name"), (.60, "Person Visiting")]:
        py = y1 + (y2 - y1) * yy
        d.rounded_rectangle((x1 + 20, py, x2 - 20, py + 34), radius=7, fill="#ffffff", outline="#cad4df", width=2)
        txt(d, (x1 + 31, py + 17), title, 17, MID, anchor="lm")
    py = y1 + (y2 - y1) * .76
    d.rounded_rectangle((x1 + 20, py, x2 - 20, py + 41), radius=7, fill=BLUE)
    txt(d, (center, py + 20), "Sign In", 20, "#ffffff", True, "mm")


def front_view(im, d, spec, cx, ground, scale):
    base_w, base_d, base_t = spec["base"]
    hw, hh, ht = spec["head"]
    height = spec["height"]
    post_w = spec["post_width"]
    head_bottom = height - hh
    # Hardware.
    d.rounded_rectangle((cx - base_w*scale/2, ground-base_t*scale, cx + base_w*scale/2, ground), radius=9, fill=CHARCOAL)
    d.rectangle((cx-post_w*scale/2, ground-(head_bottom+12)*scale, cx+post_w*scale/2, ground-base_t*scale), fill=CHARCOAL)
    hx1, hx2 = cx-hw*scale/2, cx+hw*scale/2
    hy1, hy2 = ground-height*scale, ground-head_bottom*scale
    d.rounded_rectangle((hx1,hy1,hx2,hy2),radius=24,fill="#f1f4f6",outline="#9cabb7",width=4)
    sw, sh = 182, 291
    sx1, sx2 = cx-sw*scale/2, cx+sw*scale/2
    sy1 = hy1 + (hh-sh)*scale/2
    sy2 = sy1 + sh*scale
    draw_screen(im,d,sx1,sy1,sx2,sy2)
    # Main dimensions.
    dim_h(d,hx1,hx2,hy1-55,hy1,f"{hw} head")
    dim_h(d,cx-base_w*scale/2,cx+base_w*scale/2,ground+73,ground,f"{base_w} base")
    dim_v(d,hy1,ground,cx+base_w*scale/2+68,cx+base_w*scale/2,f"{height} overall")
    txt(d,(cx,ground+155),"FRONT ELEVATION",31,NAVY,True,"mm")
    return hy1


def side_view(d, spec, cx, ground, scale):
    base_w, base_d, base_t = spec["base"]
    hw, hh, ht = spec["head"]
    height = spec["height"]
    post_d = spec["post_depth"]
    tilt = math.radians(spec["tilt"])
    # y is device depth (rear positive), z is height.
    zc = height - (math.cos(tilt)*hh/2 + math.sin(tilt)*ht/2)
    def point(y,z):
        wy = math.cos(tilt)*y + math.sin(tilt)*z
        wz = zc - math.sin(tilt)*y + math.cos(tilt)*z
        return cx+wy*scale, ground-wz*scale
    d.rounded_rectangle((cx-base_d*scale/2,ground-base_t*scale,cx+base_d*scale/2,ground),radius=8,fill=CHARCOAL)
    bottom = height - hh
    if spec["kind"] == "floor":
        d.rectangle((cx-post_d*scale/2,ground-(bottom+8)*scale,cx+post_d*scale/2,ground-base_t*scale),fill=CHARCOAL)
    else:
        # Slanted triangular low-rise counter support.
        d.polygon([(cx-50*scale,ground-base_t*scale),(cx+52*scale,ground-base_t*scale),(cx+31*scale,ground-230*scale),(cx-7*scale,ground-230*scale)],fill=CHARCOAL)
    pts=[point(-ht/2,-hh/2),point(ht/2,-hh/2),point(ht/2,hh/2),point(-ht/2,hh/2)]
    d.polygon(pts,fill="#e8edf0")
    d.line(pts+[pts[0]],fill=NAVY,width=4,joint="curve")
    # Front glass line.
    p1=point(-ht/2,-hh/2+29.5)
    p2=point(-ht/2,hh/2-29.5)
    d.line((p1[0],p1[1],p2[0],p2[1]),fill="#1c2c3e",width=10)
    dim_h(d,cx-base_d*scale/2,cx+base_d*scale/2,ground+73,ground,f"{base_d} base")
    ytop=min(p[1] for p in pts)
    dim_v(d,ytop,ground,cx+base_d*scale/2+60,cx+base_d*scale/2,f"{height} overall")
    txt(d,(cx+80,ytop-78),f"{spec['tilt']}° back tilt",25,NAVY)
    d.line((cx+60,ytop-50,pts[3][0],pts[3][1]),fill=MID,width=2)
    txt(d,(cx,ground+155),"SIDE ELEVATION",31,NAVY,True,"mm")


def top_view(d, spec, cx, cy, scale):
    bw, bd, _ = spec["base"]
    hw, _, hd = spec["head"]
    d.rounded_rectangle((cx-bw*scale/2,cy-bd*scale/2,cx+bw*scale/2,cy+bd*scale/2),radius=12,fill="#d8e0e5",outline=NAVY,width=3)
    d.rectangle((cx-hw*scale/2,cy-30*scale,cx+hw*scale/2,cy+(-30+hd)*scale),fill="#eff3f6",outline=NAVY,width=3)
    dim_h(d,cx-bw*scale/2,cx+bw*scale/2,cy+bd*scale/2+58,cy+bd*scale/2,f"{bw}")
    dim_v(d,cy-bd*scale/2,cy+bd*scale/2,cx+bw*scale/2+56,cx+bw*scale/2,f"{bd}")
    txt(d,(cx,cy+bd*scale/2+135),"TOP / FOOTPRINT",31,NAVY,True,"mm")


def sheet(spec):
    im=Image.new("RGB",(W,H),"#ffffff")
    d=ImageDraw.Draw(im)
    d.rectangle((0,0,W,18),fill=BLUE)
    paste_logo(im,(95,85,540))
    txt(d,(W-110,115),spec["title"],55,NAVY,True,"ra")
    txt(d,(W-110,178),"DIMENSIONED DESIGN CONCEPT  /  MILLIMETRES",24,MID,anchor="ra")
    d.line((95,235,W-95,235),fill="#dce3e9",width=3)
    scale=spec["scale"]
    ground=spec["ground"]
    front_view(im,d,spec,630,ground,scale)
    side_view(d,spec,1430,ground,scale)
    # Plan view and small bill of key dimensions.
    top_view(d,spec,2160,720,0.78 if spec["kind"]=="floor" else 1.05)
    d.rounded_rectangle((1850,1170,2490,1550),radius=18,fill="#f4f7fa",outline="#d9e2e9",width=2)
    txt(d,(1895,1212),"KEY SIZES",29,NAVY,True)
    rows=[
        f"Tablet enclosure   {spec['head'][0]} W × {spec['head'][1]} H × {spec['head'][2]} D",
        "Active display        182 W × 291 H",
        f"Stand structure    {spec['structure']}",
        f"Weighted base      {spec['base'][0]} W × {spec['base'][1]} D × {spec['base'][2]} T",
        f"Screen inclination  {spec['tilt']}° from vertical",
    ]
    for i,row in enumerate(rows):
        txt(d,(1895,1275+i*52),row,25,NAVY)
    d.line((95,1770,W-95,1770),fill="#dce3e9",width=3)
    txt(d,(95,1808),"VISUALCNS  /  VISITOR SIGN-IN HARDWARE",24,NAVY,True)
    txt(d,(W-95,1808),"CONCEPT ONLY  ·  DIMENSIONS GOVERN  ·  NOT A FABRICATION DRAWING",21,MID,anchor="ra")
    im.save(OUT/f"visualcns-{spec['kind']}-dimensions.jpg",format="JPEG",quality=96,subsampling=0)


FLOOR={
    "kind":"floor", "title":"FLOOR-STANDING KIOSK", "height":1240,
    "head":(257,350,22), "base":(320,300,10),
    "post_width":65,"post_depth":65,"tilt":15,
    "structure":"65 × 65 pedestal", "scale":1.00,"ground":1580,
}
TABLE={
    "kind":"tabletop", "title":"TABLETOP KIOSK", "height":430,
    "head":(257,350,22), "base":(300,220,8),
    "post_width":85,"post_depth":70,"tilt":25,
    "structure":"85 W low-rise support", "scale":2.20,"ground":1510,
}


if __name__=="__main__":
    sheet(FLOOR)
    sheet(TABLE)
    renders={
        "floor":GEN/"exec-3a57ffe2-4efb-43f3-8c72-15ecd898fcfd.png",
        "tabletop":GEN/"exec-cbfb5f77-e191-4073-8a37-7645f0440c21.png",
    }
    for name,path in renders.items():
        Image.open(path).convert("RGB").save(OUT/f"visualcns-{name}-3d.jpg",format="JPEG",quality=96,subsampling=0)
    print("\n".join(str(p) for p in sorted(OUT.glob("*.jpg"))))
