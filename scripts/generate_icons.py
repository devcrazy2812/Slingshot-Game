"""
generate_icons.py
Bespoke High-Precision Icon Renderer for Slingshot: Event Horizon
Renders anti-aliased icons with pure standard library Python (struct + zlib).
"""
import math
import os
import struct
import zlib

def write_png(filename, width, height, rgba_data):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    raw_lines = []
    stride = width * 4
    for y in range(height):
        raw_lines.append(b'\x00' + rgba_data[y * stride : (y + 1) * stride])
    compressed = zlib.compress(b''.join(raw_lines), 9)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png)

def render_icon(size, is_foreground=False, is_round=False):
    buf = bytearray(size * size * 4)
    half = size / 2.0
    scale = size / 512.0

    # Singularity center
    bh_x = 220.0 * scale
    bh_y = 275.0 * scale
    bh_r = 44.0 * scale

    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4

            # Distance from center for rounded/squircle masking
            dx_c = x - half
            dy_c = y - half
            dist_c = math.hypot(dx_c, dy_c)

            if is_round and dist_c > half:
                # Outside circle
                buf[idx + 3] = 0
                continue

            # Corner mask for square icons (squircle radius ~ 22%)
            corner_r = size * 0.22
            in_corner_x = abs(dx_c) > (half - corner_r)
            in_corner_y = abs(dy_c) > (half - corner_r)
            if not is_round and not is_foreground and in_corner_x and in_corner_y:
                cx = (half - corner_r) * (1 if dx_c > 0 else -1)
                cy = (half - corner_r) * (1 if dy_c > 0 else -1)
                if math.hypot(dx_c - cx, dy_c - cy) > corner_r:
                    buf[idx + 3] = 0
                    continue

            # Base background color
            if is_foreground:
                r, g, b, a = 0.0, 0.0, 0.0, 0.0
            else:
                # Deep space radial gradient
                bg_factor = dist_c / (half * 1.414)
                r = 10.0 + (1.0 - bg_factor) * 12.0
                g = 14.0 + (1.0 - bg_factor) * 15.0
                b = 26.0 + (1.0 - bg_factor) * 22.0
                a = 255.0

            # 1. Singularity Accretion Disk (Tilted Ellipse)
            # Rotate by -26 degrees
            rad_ang = math.radians(-26)
            cos_a = math.cos(rad_ang)
            sin_a = math.sin(rad_ang)

            rel_x = x - bh_x
            rel_y = y - bh_y
            rot_x = rel_x * cos_a - rel_y * sin_a
            rot_y = rel_x * sin_a + rel_y * cos_a

            rx_norm = rot_x / (155.0 * scale)
            ry_norm = rot_y / (88.0 * scale)
            ellipse_d = math.hypot(rx_norm, ry_norm)

            if 0.35 < ellipse_d < 1.05:
                disk_intensity = math.sin((ellipse_d - 0.35) / 0.70 * math.pi)
                # Outer cyan / purple / gold
                if ellipse_d < 0.6:
                    dr, dg, db = 251.0, 191.0, 36.0 # Gold
                elif ellipse_d < 0.8:
                    dr, dg, db = 236.0, 72.0, 153.0 # Magenta
                else:
                    dr, dg, db = 0.0, 247.0, 255.0 # Cyan

                blend = disk_intensity * 0.85
                r = r * (1.0 - blend) + dr * blend
                g = g * (1.0 - blend) + dg * blend
                b = b * (1.0 - blend) + db * blend
                if is_foreground:
                    a = max(a, blend * 255.0)

            # Black Hole Singularity Core
            d_bh = math.hypot(x - bh_x, y - bh_y)
            if d_bh < bh_r:
                r, g, b = 0.0, 0.0, 0.0
                if is_foreground:
                    a = max(a, 240.0)
            elif d_bh < bh_r + 3.0 * scale:
                # Photon sphere gold rim
                r, g, b = 251.0, 191.0, 36.0
                if is_foreground:
                    a = 255.0

            # 2. Hyperbolic Slingshot Arc Trail
            # Parametric cubic approximation: sample arc distance
            t_steps = 100
            min_arc_d = 9999.0
            for i in range(t_steps):
                t = i / float(t_steps)
                # Bezier: P0=(70, 410), P1=(130, 380), P2=(230, 205), P3=(385, 75)
                ax = ((1-t)**3 * 70 + 3*(1-t)**2*t * 130 + 3*(1-t)*t**2 * 230 + t**3 * 385) * scale
                ay = ((1-t)**3 * 410 + 3*(1-t)**2*t * 380 + 3*(1-t)*t**2 * 205 + t**3 * 75) * scale
                ad = math.hypot(x - ax, y - ay)
                if ad < min_arc_d:
                    min_arc_d = ad

            arc_width = 3.5 * scale
            if min_arc_d < arc_width:
                arc_blend = (1.0 - min_arc_d / arc_width)
                ar_col = (0.0, 247.0, 255.0) if min_arc_d > 1.2 * scale else (255.0, 255.0, 255.0)
                r = r * (1.0 - arc_blend) + ar_col[0] * arc_blend
                g = g * (1.0 - arc_blend) + ar_col[1] * arc_blend
                b = b * (1.0 - arc_blend) + ar_col[2] * arc_blend
                if is_foreground:
                    a = max(a, arc_blend * 255.0)

            # 3. Vanguard Stealth Interceptor (at 385, 75)
            ship_cx = 385.0 * scale
            ship_cy = 75.0 * scale
            # Rotate by 32 deg
            s_rad = math.radians(32)
            s_cos = math.cos(s_rad)
            s_sin = math.sin(s_rad)
            sx = (x - ship_cx) * s_cos - (y - ship_cy) * s_sin
            sy = (x - ship_cx) * s_sin + (y - ship_cy) * s_cos
            sx /= scale
            sy /= scale

            # Triangle arrowhead hull: nose at (28, 0), wings at (-18, -20) and (-18, 20)
            if -18 <= sx <= 28 and abs(sy) <= (28 - sx) * 0.45:
                # Ship body
                if sx > 16:
                    r, g, b = 255.0, 255.0, 255.0 # Nose
                elif abs(sy) < 3.0 and sx > -5:
                    r, g, b = 0.0, 247.0, 255.0 # Cockpit cyan core
                else:
                    r, g, b = 241.0, 245.0, 249.0 # Metal hull
                if is_foreground:
                    a = 255.0
            # Thruster flame
            elif -32 <= sx < -18 and abs(sy) <= (sx + 32) * 0.35:
                r, g, b = 0.0, 247.0, 255.0
                if is_foreground:
                    a = 255.0

            buf[idx] = min(255, int(r))
            buf[idx + 1] = min(255, int(g))
            buf[idx + 2] = min(255, int(b))
            buf[idx + 3] = min(255, int(a))

    return bytes(buf)

def main():
    print("Generating bespoke high-precision icons...")
    sizes = {
        'public/icon.png': (512, False, False),
        'android/app/src/main/res/mipmap-mdpi/ic_launcher.png': (48, False, False),
        'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png': (48, False, True),
        'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png': (48, True, False),
        'android/app/src/main/res/mipmap-hdpi/ic_launcher.png': (72, False, False),
        'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png': (72, False, True),
        'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png': (72, True, False),
        'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png': (96, False, False),
        'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png': (96, False, True),
        'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png': (96, True, False),
        'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png': (144, False, False),
        'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png': (144, False, True),
        'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png': (144, True, False),
        'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png': (192, False, False),
        'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png': (192, False, True),
        'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png': (192, True, False),
    }

    for path, (sz, is_fore, is_rnd) in sizes.items():
        data = render_icon(sz, is_foreground=is_fore, is_round=is_rnd)
        write_png(path, sz, sz, data)
        print(f"Generated {path} ({sz}x{sz})")

    print("All icons successfully generated!")

if __name__ == '__main__':
    main()
