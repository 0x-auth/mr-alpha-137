"""
Post-Alpha test script v3.
Fixes applied per Space's read:
1. Twist estimation now uses full 3D (x,y,z) shoulder/hip vectors, not 2D pixel-width ratio.
2. Light angle is anchored to the torso's own normal vector (the direction the
   chest is actually facing in 3D), not hardcoded relative to camera/frame.
"""

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

IMG_PATH = "tests/fixtures/sample_profile.jpg"
OUT_PATH = "pose_light_result.jpg"
MODEL_PATH = "models/pose_landmarker.task"

img_bgr = cv2.imread(IMG_PATH)
h, w = img_bgr.shape[:2]
img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.PoseLandmarkerOptions(base_options=base_options)
landmarker = vision.PoseLandmarker.create_from_options(options)
result = landmarker.detect(mp_image)

if not result.pose_landmarks:
    print("No pose detected.")
    exit()

lm = result.pose_landmarks[0]

# MediaPipe z is roughly in "hip-depth" units, same scale-ish as x.
# Build full 3D points (still using pixel scale for x,y; z is relative).
def p3(landmark):
    return np.array([landmark.x * w, landmark.y * h, landmark.z * w])

l_sh = p3(lm[11]); r_sh = p3(lm[12])
l_hip = p3(lm[23]); r_hip = p3(lm[24])

torso_center_3d = (l_sh + r_sh + l_hip + r_hip) / 4

# Two in-plane vectors of the torso: across (shoulder line) and "up".
# Previous attempt: derived "up" from mid_shoulder -> mid_hip. That breaks
# the moment the spine curls (e.g. a crunch), because the spine vector
# then points substantially toward/away from camera, not just diagonally
# within the shoulder plane -- and Gram-Schmidt against `across` alone
# can't strip that out, since the contamination isn't in that direction.
#
# Fix: anchor "up" to world-space gravity instead of the (bendable) spine.
# Project a fixed gravity-up vector into the torso's own plane (the plane
# whose normal we're trying to find) by removing whatever component of
# gravity-up is already parallel to the shoulder line. What's left is a
# clean "vertical within the chest plane" vector that doesn't care how
# much the spine itself is curled.
gravity_up = np.array([0.0, -1.0, 0.0])  # image y-axis points down, so "up" is -y

across = r_sh - l_sh
across_unit = across / (np.linalg.norm(across) + 1e-6)

lean_component = np.dot(gravity_up, across_unit) * across_unit
up = gravity_up - lean_component
up = up / (np.linalg.norm(up) + 1e-6)

# Torso normal = cross product of the two in-plane vectors.
# This points straight out of the chest, in true 3D, regardless of camera angle
# or how much the spine itself is bent.
normal = np.cross(across, up)
normal = normal / (np.linalg.norm(normal) + 1e-6)

# Twist relative to camera: angle between torso normal and the camera's
# view axis (0,0,-1 in this convention, i.e. straight at camera).
camera_axis = np.array([0, 0, -1])
cos_twist = np.dot(normal[:3], camera_axis) / (np.linalg.norm(normal[:3]) + 1e-6)
twist_deg = np.degrees(np.arccos(np.clip(abs(cos_twist), -1, 1)))
# note: abs() because normal direction sign is ambiguous (front vs back of torso)
# without a consistent winding convention — flag this as a known limitation, see below

# Light vector: anchored to torso normal, offset 40 degrees around the
# vertical (up) axis from the normal itself -- NOT from camera facing.
# Rotate `normal` by 40 deg around `up` axis using Rodrigues' rotation formula.
def rotate_around_axis(vec, axis, angle_deg):
    axis = axis / (np.linalg.norm(axis) + 1e-6)
    angle = np.radians(angle_deg)
    return (vec * np.cos(angle)
            + np.cross(axis, vec) * np.sin(angle)
            + axis * np.dot(axis, vec) * (1 - np.cos(angle)))

light_dir_3d = rotate_around_axis(normal, up, 40)

# Project the 3D light direction back to 2D screen space for the arrow overlay
# (drop z, this is just for visualization on a flat image)
light_dir_2d = light_dir_3d[:2]
light_dir_2d = light_dir_2d / (np.linalg.norm(light_dir_2d) + 1e-6)

torso_center_2d = torso_center_3d[:2]
arrow_len = 180
arrow_end = torso_center_2d + light_dir_2d * arrow_len

# --- Draw ---
annotated = img_bgr.copy()
for point in lm:
    cx, cy = int(point.x * w), int(point.y * h)
    cv2.circle(annotated, (cx, cy), 3, (255, 255, 255), -1)

def draw_line(a, b, color=(200, 200, 200)):
    cv2.line(annotated, tuple(a[:2].astype(int)), tuple(b[:2].astype(int)), color, 2)

draw_line(l_sh, r_sh)
draw_line(l_sh, l_hip)
draw_line(r_sh, r_hip)
draw_line(l_hip, r_hip)

cv2.arrowedLine(
    annotated,
    tuple(torso_center_2d.astype(int)),
    tuple(arrow_end.astype(int)),
    (0, 165, 255), 4, tipLength=0.25
)
cv2.circle(annotated, tuple(torso_center_2d.astype(int)), 6, (0, 165, 255), -1)

cv2.putText(annotated, f"3D twist~{twist_deg:.0f}deg", (20, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
cv2.putText(annotated, f"normal-anchored light", (20, 60),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)

cv2.imwrite(OUT_PATH, annotated)

print(f"Shoulder Z gap (l vs r): {l_sh[2]:.1f} vs {r_sh[2]:.1f}")
print(f"Torso normal (3D): {normal}")
print(f"3D twist vs camera: {twist_deg:.1f} deg")
print(f"Light dir (3D, normal-anchored): {light_dir_3d}")
print(f"Saved to {OUT_PATH}")
