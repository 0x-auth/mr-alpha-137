#!/usr/bin/env bash
# Downloads the mediapipe pose landmarker model used by post-alpha/pose_light.py
set -e
mkdir -p "$(dirname "$0")/../models"
curl -sL -o "$(dirname "$0")/../models/pose_landmarker.task" \
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
echo "Model downloaded to models/pose_landmarker.task"
