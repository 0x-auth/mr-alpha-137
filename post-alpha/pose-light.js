/**
 * pose-light.js — JS port of pose_light.py's torso-normal + light-vector math.
 * Ported for browser/MediaPipe-JS use (Option A: client-side only, no server).
 *
 * This file includes a self-test at the bottom that checks the JS math against
 * the exact landmark values from our validated Python run (v5, gravity-anchored
 * normal). If the self-test numbers don't match the Python reference within
 * a small tolerance, something in the port is wrong.
 */

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm(a) {
  return Math.sqrt(dot(a, a));
}

function normalize(a) {
  const n = norm(a) + 1e-6;
  return scale(a, 1 / n);
}

function rotateAroundAxis(vec, axis, angleDeg) {
  const axisUnit = normalize(axis);
  const angle = (angleDeg * Math.PI) / 180;
  const term1 = scale(vec, Math.cos(angle));
  const term2 = scale(cross(axisUnit, vec), Math.sin(angle));
  const term3 = scale(axisUnit, dot(axisUnit, vec) * (1 - Math.cos(angle)));
  return add(add(term1, term2), term3);
}

/**
 * Main computation. Takes 4 landmarks (each {x, y, z} in MediaPipe's
 * normalized 0-1 coordinate space) plus image width/height, and returns
 * the same quantities the Python script prints: torso normal, twist angle,
 * and the normal-anchored light direction.
 */
function computePoseLight(landmarks, imgWidth, imgHeight) {
  const { leftShoulder, rightShoulder, leftHip, rightHip } = landmarks;

  // Convert normalized landmarks to pixel-scale 3D points, same as
  // Python's p3(): [x * w, y * h, z * w]
  const toPoint3D = (lm) => [lm.x * imgWidth, lm.y * imgHeight, lm.z * imgWidth];

  const lSh = toPoint3D(leftShoulder);
  const rSh = toPoint3D(rightShoulder);
  const lHip = toPoint3D(leftHip);
  const rHip = toPoint3D(rightHip);

  const torsoCenter3D = scale(add(add(lSh, rSh), add(lHip, rHip)), 0.25);

  // Gravity-anchored "up" — the fix validated in the Python version.
  // Image y-axis points down, so "up" is -y.
  const gravityUp = [0, -1, 0];

  const across = subtract(rSh, lSh);
  const acrossUnit = normalize(across);

  const leanComponent = scale(acrossUnit, dot(gravityUp, acrossUnit));
  const up = normalize(subtract(gravityUp, leanComponent));

  const normal = normalize(cross(across, up));

  // Twist relative to camera
  const cameraAxis = [0, 0, -1];
  const cosTwist = dot(normal, cameraAxis) / (norm(normal) + 1e-6);
  const twistDeg = (Math.acos(Math.min(1, Math.max(-1, Math.abs(cosTwist)))) * 180) / Math.PI;

  // Light vector: normal rotated 40 degrees around the up axis
  const lightDir3D = rotateAroundAxis(normal, up, 40);

  return {
    torsoCenter3D,
    normal,
    twistDeg,
    lightDir3D,
  };
}

// ---------------------------------------------------------------------
// SELF-TEST: exact landmark values pulled from the validated Python run
// on tests/fixtures/sample_profile.jpg. Python reference output was:
//   Torso normal (3D): [9.97563819e-01, 3.67132342e-19, 6.97597333e-02]
//   3D twist vs camera: 86.0 deg
//   Light dir (3D, normal-anchored): [0.7193733, -0.02565501, 0.69414915]
// ---------------------------------------------------------------------
function runSelfTest() {
  const landmarks = {
    leftShoulder: { x: 0.7422705888748169, y: 0.5551541447639465, z: -0.04568716883659363 },
    rightShoulder: { x: 0.7071391940116882, y: 0.5249801278114319, z: 0.45669159293174744 },
    leftHip: { x: 0.485850065946579, y: 0.6527753472328186, z: -0.17570455372333527 },
    rightHip: { x: 0.48223456740379333, y: 0.6145390272140503, z: 0.17548608779907227 },
  };

  const result = computePoseLight(landmarks, 600, 400);

  const pythonReference = {
    normal: [9.97563819e-01, 3.67132342e-19, 6.97597333e-02],
    twistDeg: 86.0,
    lightDir3D: [0.7193733, -0.02565501, 0.69414915],
  };

  const tolerance = 0.01;
  const closeEnough = (a, b) => Math.abs(a - b) < tolerance;

  console.log('--- JS self-test vs Python reference ---');
  console.log('JS normal:    ', result.normal.map((v) => v.toFixed(6)));
  console.log('Python normal:', pythonReference.normal.map((v) => v.toFixed(6)));
  console.log('JS twist:    ', result.twistDeg.toFixed(2), 'deg');
  console.log('Python twist:', pythonReference.twistDeg.toFixed(2), 'deg');
  console.log('JS lightDir:    ', result.lightDir3D.map((v) => v.toFixed(6)));
  console.log('Python lightDir:', pythonReference.lightDir3D.map((v) => v.toFixed(6)));

  const normalMatches = result.normal.every((v, i) => closeEnough(v, pythonReference.normal[i]));
  const twistMatches = closeEnough(result.twistDeg, pythonReference.twistDeg);
  const lightDirMatches = result.lightDir3D.every((v, i) =>
    closeEnough(v, pythonReference.lightDir3D[i])
  );

  console.log('');
  console.log('normal match:   ', normalMatches ? 'PASS' : 'FAIL');
  console.log('twist match:    ', twistMatches ? 'PASS' : 'FAIL');
  console.log('lightDir match: ', lightDirMatches ? 'PASS' : 'FAIL');
  console.log('');
  console.log(
    normalMatches && twistMatches && lightDirMatches
      ? '✅ ALL TESTS PASSED — JS port matches Python reference'
      : '❌ MISMATCH — JS port does NOT match Python reference, do not trust this yet'
  );
}

runSelfTest();

module.exports = { computePoseLight };

