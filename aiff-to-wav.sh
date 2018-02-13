#!/bin/bash

cd public/streams_revelo

for f in *.aiff; do ffmpeg -i "$f" "${f%.aiff}.wav"; done
for f in *.aif; do ffmpeg -i "$f" "${f%.aif}.wav"; done
