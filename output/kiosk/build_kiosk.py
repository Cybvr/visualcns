"""Dimensioned concept drawings, preview, and GLB for a visitor kiosk.

All design dimensions are millimetres. This is a concept model, not shop CAD.
"""

from __future__ import annotations

import io
import json
import math
import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas


OUT = Path(__file__).parent
OUT.mkdir(parents=True, exist_ok=True)

# Millimetres. The screen is a 21.5-inch 16:9 panel mounted in portrait.
D = {
    "overall_height": 1400,
    "base_width": 500,
    "base_depth": 400,
    "base_thickness": 30,
    "post_width": 120,
    "post_depth": 80,
    "post_top": 825,
    "head_width": 340,
    "head_height": 610,
    "head_depth": 55,
    "head_tilt_degrees": 12,
    "screen_width": 268,
    "screen_height": 477,
    "screen_lower_margin": 78,
}

WHITE = (0.88, 0.90, 0.90, 1)
DARK = (0.055, 0.075, 0.095, 1)
BLUE = (0.02, 0.28, 0.82, 1)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)


def ui_image() -> Image.Image:
    image = Image.new("RGB", (536, 954), "#f6f8fb")
    p = ImageDraw.Draw(image)
    p.text((268, 115), "Welcome", anchor="mm", font=font(35), fill="#26323e")
    p.text((268, 188), "Visitor Sign-in", anchor="mm", font=font(49, True), fill="#152432")
    for y, title in [(315, "Full Name"), (445, "Person You Are Visiting")]:
        p.rounded_rectangle((45, y, 491, y + 93), radius=13, fill="white", outline="#cbd4de", width=3)
        p.text((69, y + 46), title, anchor="lm", font=font(29), fill="#6b7785")
    p.rounded_rectangle((45, 608, 491, 715), radius=15, fill="#0858d8")
    p.text((268, 661), "Sign In", anchor="mm", font=font(39, True), fill="white")
    image.save(OUT / "kiosk-screen.png")
    return image


def make_pdf() -> None:
    path = OUT / "visitor-kiosk-dimensioned-concept.pdf"
    c = canvas.Canvas(str(path), pagesize=landscape(A3))
    W, H = landscape(A3)

    def text(x, y, s, size=9, bold=False, col="#132b42"):
        c.setFillColor(colors.HexColor(col))
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.drawString(x * mm, y * mm, s)

    def line(x1, y1, x2, y2, width=0.35, col="#243b53"):
        c.setStrokeColor(colors.HexColor(col))
        c.setLineWidth(width * mm)
        c.line(x1 * mm, y1 * mm, x2 * mm, y2 * mm)

    def rect(x, y, w, h, fill=None, stroke="#243b53", radius=0):
        c.setStrokeColor(colors.HexColor(stroke))
        c.setLineWidth(0.35 * mm)
        if fill:
            c.setFillColor(colors.HexColor(fill))
        else:
            c.setFillColor(colors.white)
        c.roundRect(x * mm, y * mm, w * mm, h * mm, radius * mm, stroke=1, fill=1)

    def dim_h(x1, x2, y, witness_y, label):
        line(x1, witness_y, x1, y + 3, 0.18, "#74899a")
        line(x2, witness_y, x2, y + 3, 0.18, "#74899a")
        line(x1, y, x2, y, 0.18, "#74899a")
        for x, sign in [(x1, 1), (x2, -1)]:
            line(x, y, x + sign * 2.5, y + 1.4, 0.18, "#74899a")
        text((x1 + x2) / 2 - len(label) * 1.15, y + 2, label, 8)

    def dim_v(y1, y2, x, witness_x, label):
        line(witness_x, y1, x + 3, y1, 0.18, "#74899a")
        line(witness_x, y2, x + 3, y2, 0.18, "#74899a")
        line(x, y1, x, y2, 0.18, "#74899a")
        for y, sign in [(y1, 1), (y2, -1)]:
            line(x, y, x + 1.4, y + sign * 2.5, 0.18, "#74899a")
        text(x + 2.5, (y1 + y2) / 2, label, 8)

    c.setFillColor(colors.HexColor("#f8fafb"))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    text(20, 275, "VISITOR SIGN-IN KIOSK", 20, True)
    text(20, 265, "Dimensioned concept / 21.5-inch portrait touchscreen / units: mm", 10)
    line(20, 258, 400, 258, 0.5)

    # Front elevation, 1:10.
    s = 0.1
    fx, gy = 105, 67
    rect(fx - 25, gy, 50, 3, "#dbe2e8")
    rect(fx - 6, gy + 3, 12, 79.5, "#e6ebef")
    head_bottom = gy + 80.5
    rect(fx - 17, head_bottom, 34, 61, "#e6ebef", radius=1.7)
    sx, sy = fx - 13.4, head_bottom + 7.8
    rect(sx, sy, 26.8, 47.7, "#101b29", radius=0.7)
    rect(sx + 0.5, sy + 0.5, 25.8, 46.7, "#f6f8fb", stroke="#f6f8fb")
    text(fx - 8.2, sy + 35, "Visitor", 8, True)
    text(fx - 7.8, sy + 31, "Sign-in", 8, True)
    for y in [sy + 19.5, sy + 25.5]:
        rect(fx - 9.5, y, 19, 4.3, "#ffffff", stroke="#cad5e0", radius=0.5)
    rect(fx - 9.5, sy + 9, 19, 4.6, "#0b59d7", stroke="#0b59d7", radius=0.5)
    text(fx - 4, sy + 10.7, "SIGN IN", 5.6, True, "#ffffff")
    dim_h(fx - 25, fx + 25, 54, gy, "500")
    dim_h(fx - 17, fx + 17, 216, head_bottom + 61, "340")
    dim_h(sx, sx + 26.8, 206, sy + 47.7, "268 ACTIVE")
    dim_v(gy, gy + 140, 149, fx + 25, "1400 OVERALL")
    dim_v(sy, sy + 47.7, 137, sx + 26.8, "477 ACTIVE")
    text(85, 43, "FRONT ELEVATION", 10, True)
    text(93, 37, "Scale 1:10", 8)

    # Side elevation, 1:10. Positive depth is toward rear.
    bx, sy0 = 227, gy
    rect(bx - 20, sy0, 40, 3, "#dbe2e8")
    rect(bx - 4, sy0 + 3, 8, 79.5, "#e6ebef")
    theta = math.radians(12)
    yc, zc = 20.3, 1097.6
    corners = []
    for yy, zz in [(-27.5, -305), (27.5, -305), (27.5, 305), (-27.5, 305)]:
        world_y = yc + math.cos(theta) * yy + math.sin(theta) * zz
        world_z = zc - math.sin(theta) * yy + math.cos(theta) * zz
        corners.append((bx + world_y * s, gy + world_z * s))
    path2 = c.beginPath()
    path2.moveTo(corners[0][0] * mm, corners[0][1] * mm)
    for x, y in corners[1:]:
        path2.lineTo(x * mm, y * mm)
    path2.close()
    c.setFillColor(colors.HexColor("#e6ebef"))
    c.setStrokeColor(colors.HexColor("#243b53"))
    c.drawPath(path2, fill=1, stroke=1)
    # Glass runs up the front face.
    def point_front(local_z):
        yy = yc + math.cos(theta) * -27.5 + math.sin(theta) * local_z
        zz = zc - math.sin(theta) * -27.5 + math.cos(theta) * local_z
        return bx + yy * s, gy + zz * s
    a = point_front(-305 + 78)
    b = point_front(-305 + 78 + 477)
    line(*a, *b, 1.4, "#112337")
    dim_h(bx - 20, bx + 20, 54, gy, "400")
    dim_v(gy, gy + 140, 257, bx + 20, "1400")
    text(203, 43, "SIDE ELEVATION", 10, True)
    text(215, 37, "Scale 1:10", 8)
    text(253, 219, "12 deg back tilt", 8)
    line(251, 217, corners[3][0], corners[3][1], 0.18, "#74899a")

    # Plan view.
    px, py = 337, 111
    rect(px - 25, py - 20, 50, 40, "#dbe2e8")
    rect(px - 6, py - 4, 12, 8, "#e6ebef")
    rect(px - 17, py - 7, 34, 5.5, "#c5d0d9")
    dim_h(px - 25, px + 25, 83, py - 20, "500")
    dim_v(py - 20, py + 20, 368, px + 25, "400")
    text(320, 76, "PLAN / FOOTPRINT", 10, True)
    text(326, 70, "Scale 1:10", 8)

    # Key data and design notes.
    text(302, 222, "DESIGN DIMENSIONS", 11, True)
    rows = [
        "Overall: 1400 H x 500 W x 400 D",
        "Head: 340 W x 610 H x 55 D",
        "Display active: 268 W x 477 H",
        "Pedestal: 120 W x 80 D",
        "Base: 500 W x 400 D x 30 T",
        "Screen tilt: 12 deg from vertical",
        "Lowest active touch: about 880 AFF",
        "Highest form field: about 1190 AFF",
    ]
    for i, row in enumerate(rows):
        text(302, 210 - i * 7, row, 8.5)
    text(302, 149, "AFF = above finished floor", 7.5, col="#567086")

    line(20, 28, 400, 28, 0.35)
    text(20, 21, "Concept proportions based on manufacturer 21.5-inch kiosk dimensions; verify components, anchorage, and stability before fabrication.", 8)
    text(20, 15, "Reference: Protech KS-Y600 (21.5-inch portrait) and IMU P2C 21.5 kiosk; access range: U.S. Access Board ADA guide.", 7.5)
    text(20, 8.7, "This is an original design study, not a copy of either manufacturer's drawings. Allow a 760 x 1220 mm clear approach area adjacent to installation.", 7.5)
    c.showPage()
    c.save()


def glb_model(screen: Image.Image) -> None:
    """Create a compact, texture-bearing glTF binary using box and quad meshes."""
    binary = bytearray()
    views = []
    accessors = []
    meshes = []
    nodes = []

    def add_blob(blob, target=None):
        while len(binary) % 4:
            binary.append(0)
        start = len(binary)
        binary.extend(blob)
        v = {"buffer": 0, "byteOffset": start, "byteLength": len(blob)}
        if target:
            v["target"] = target
        views.append(v)
        return len(views) - 1

    def mesh(name, verts, normals, uvs, indices, material):
        def flist(data):
            return struct.pack("<" + "f" * len(data), *data)
        v0 = add_blob(flist([q for p in verts for q in p]), 34962)
        v1 = add_blob(flist([q for p in normals for q in p]), 34962)
        v2 = add_blob(flist([q for p in uvs for q in p]), 34962)
        v3 = add_blob(struct.pack("<" + "H" * len(indices), *indices), 34963)
        for view, count, kind, comps, vals in [
            (v0, len(verts), "VEC3", 5126, verts),
            (v1, len(normals), "VEC3", 5126, normals),
            (v2, len(uvs), "VEC2", 5126, uvs),
            (v3, len(indices), "SCALAR", 5123, [(i,) for i in indices]),
        ]:
            a = {"bufferView": view, "componentType": comps, "count": count, "type": kind}
            if kind == "VEC3" and view == v0:
                a["min"] = [min(p[i] for p in vals) for i in range(3)]
                a["max"] = [max(p[i] for p in vals) for i in range(3)]
            accessors.append(a)
        start = len(accessors) - 4
        meshes.append({"name": name, "primitives": [{"attributes": {"POSITION": start, "NORMAL": start + 1, "TEXCOORD_0": start + 2}, "indices": start + 3, "material": material}]})
        return len(meshes) - 1

    def box(name, w, d, h, material):
        x, y, z = w / 2, d / 2, h / 2
        faces = [
            ([(-x,-y,-z),(x,-y,-z),(x,-y,z),(-x,-y,z)], (0,-1,0)),
            ([(x,y,-z),(-x,y,-z),(-x,y,z),(x,y,z)], (0,1,0)),
            ([(-x,y,-z),(-x,-y,-z),(-x,-y,z),(-x,y,z)], (-1,0,0)),
            ([(x,-y,-z),(x,y,-z),(x,y,z),(x,-y,z)], (1,0,0)),
            ([(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)], (0,0,1)),
            ([(-x,y,-z),(x,y,-z),(x,-y,-z),(-x,-y,-z)], (0,0,-1)),
        ]
        verts, norms, uvs, inds = [], [], [], []
        for face, normal in faces:
            start = len(verts)
            verts.extend(face)
            norms.extend([normal] * 4)
            uvs.extend([(0,0),(1,0),(1,1),(0,1)])
            inds.extend([start, start+1, start+2, start, start+2, start+3])
        return mesh(name, verts, norms, uvs, inds, material)

    base = box("500 x 400 x 30 mm weighted base", .5, .4, .03, 0)
    post = box("120 x 80 mm pedestal", .12, .08, .795, 0)
    head = box("340 x 610 x 55 mm enclosure", .34, .055, .61, 0)
    border = box("black screen bezel", .278, .002, .487, 1)
    verts = [(-.134,-.030,.0115-.2385),(.134,-.030,.0115-.2385),(.134,-.030,.0115+.2385),(-.134,-.030,.0115+.2385)]
    screen_mesh = mesh("268 x 477 mm active touchscreen", verts, [(0,-1,0)]*4, [(0,1),(1,1),(1,0),(0,0)], [0,1,2,0,2,3], 2)
    angle = -math.radians(12)
    quat = [math.sin(angle/2),0,0,math.cos(angle/2)]
    nodes.extend([
        {"name":"Weighted base", "mesh":base, "translation":[0,0,.015]},
        {"name":"Pedestal", "mesh":post, "translation":[0,0,.4275]},
        {"name":"Tilted head assembly", "translation":[0,.0203,1.0976], "rotation":quat, "children":[3,4,5]},
        {"name":"Head shell", "mesh":head},
        {"name":"Screen bezel", "mesh":border, "translation":[0,-.0285,.0115]},
        {"name":"Touchscreen UI", "mesh":screen_mesh},
    ])
    buf = io.BytesIO()
    screen.save(buf, format="PNG")
    image_view = add_blob(buf.getvalue())
    doc = {
        "asset":{"version":"2.0", "generator":"VisualHQ parametric kiosk concept"},
        "scene":0, "scenes":[{"nodes":[0,1,2]}], "nodes":nodes,
        "meshes":meshes, "accessors":accessors, "bufferViews":views,
        "buffers":[{"byteLength":len(binary)}],
        "images":[{"bufferView":image_view,"mimeType":"image/png"}],
        "textures":[{"source":0}],
        "materials":[
            {"name":"matte white powder-coated metal", "pbrMetallicRoughness":{"baseColorFactor":WHITE,"metallicFactor":.25,"roughnessFactor":.5}},
            {"name":"black inset screen surround", "pbrMetallicRoughness":{"baseColorFactor":DARK,"metallicFactor":.05,"roughnessFactor":.35}},
            {"name":"visitor sign-in touchscreen", "pbrMetallicRoughness":{"baseColorTexture":{"index":0},"metallicFactor":0,"roughnessFactor":.4},"doubleSided":True},
        ],
    }
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js)%4)%4)
    binary += b"\0" * ((4 - len(binary)%4)%4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    with open(OUT / "visitor-kiosk-21in.glb", "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(js), b"JSON"))
        f.write(js)
        f.write(struct.pack("<I4s", len(binary), b"BIN\0"))
        f.write(binary)


def preview(screen: Image.Image) -> None:
    """Dimension-faithful axonometric illustration from the same solid geometry."""
    S = 3
    im = Image.new("RGB", (1200*S, 1400*S), "#f3f6f8")
    draw = ImageDraw.Draw(im)
    # The slight lateral offset gives a readable view of the enclosure depth.
    def project(x,y,z):
        return (600*S + S*(.95*x + .45*y), 1330*S + S*(-.08*x + .18*y - .88*z))
    def poly(points, fill, outline="#9eacb7"):
        xy=[project(*p) for p in points]
        draw.polygon(xy, fill=fill)
        draw.line(xy+[xy[0]], fill=outline, width=2*S)
    def cuboid(cx,cy,cz,w,d,h, front="#edf1f3", side="#cdd6dc", top="#ffffff"):
        x1,x2=cx-w/2,cx+w/2; y1,y2=cy-d/2,cy+d/2; z1,z2=cz-h/2,cz+h/2
        poly([(x1,y2,z1),(x2,y2,z1),(x2,y2,z2),(x1,y2,z2)], side)
        poly([(x2,y1,z1),(x2,y2,z1),(x2,y2,z2),(x2,y1,z2)], side)
        poly([(x1,y1,z1),(x2,y1,z1),(x2,y1,z2),(x1,y1,z2)], front)
        poly([(x1,y1,z2),(x2,y1,z2),(x2,y2,z2),(x1,y2,z2)], top)
    cuboid(0,0,15,500,400,30)
    cuboid(0,0,427.5,120,80,795)
    th=math.radians(12)
    def hp(x,y,z):
        return (x,20.3+math.cos(th)*y+math.sin(th)*z,1097.6-math.sin(th)*y+math.cos(th)*z)
    x1,x2=-170,170; y1,y2=-27.5,27.5; z1,z2=-305,305
    poly([hp(x1,y2,z1),hp(x2,y2,z1),hp(x2,y2,z2),hp(x1,y2,z2)], "#c6d0d7")
    poly([hp(x2,y1,z1),hp(x2,y2,z1),hp(x2,y2,z2),hp(x2,y1,z2)], "#c7d2d9")
    poly([hp(x1,y1,z1),hp(x2,y1,z1),hp(x2,y1,z2),hp(x1,y1,z2)], "#eaf0f3")
    poly([hp(x1,y1,z2),hp(x2,y1,z2),hp(x2,y2,z2),hp(x1,y2,z2)], "#ffffff")
    # Perspective-warped screen UI to the four projected corners.
    q=[hp(-134,-28,-227),hp(134,-28,-227),hp(134,-28,250),hp(-134,-28,250)]
    pts=[project(*p) for p in q]
    # PIL perspective coefficients: destination image to source UI pixels.
    import numpy as np
    def homography(src,dst):
        a=[]; b=[]
        for (x,y),(u,v) in zip(src,dst):
            a += [[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]
            b += [u,v]
        return np.linalg.solve(np.asarray(a),np.asarray(b))
    src=[(0,954),(536,954),(536,0),(0,0)]
    coeff=homography(pts,src)
    tex=screen.convert("RGBA").transform(im.size,Image.Transform.PERSPECTIVE,coeff,Image.Resampling.BICUBIC)
    mask=Image.new("L",im.size,0)
    md=ImageDraw.Draw(mask)
    md.polygon(pts,fill=255)
    im.paste(tex.convert("RGB"),(0,0),mask)
    draw=ImageDraw.Draw(im)
    draw.line(pts+[pts[0]],fill="#0c1a28",width=4*S)
    im.resize((1200,1400),Image.Resampling.LANCZOS).save(OUT/"visitor-kiosk-3d-preview.png")


if __name__ == "__main__":
    screen = ui_image()
    make_pdf()
    glb_model(screen)
    preview(screen)
    (OUT / "dimensions.json").write_text(json.dumps(D,indent=2),encoding="utf-8")
    print("Created", *(p.name for p in OUT.iterdir() if p.is_file()), sep="\n")
