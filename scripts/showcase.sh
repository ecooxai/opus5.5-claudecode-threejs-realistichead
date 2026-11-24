#!/usr/bin/env bash
# Usage: scripts/showcase.sh in.png out.png   adds 160px black band with title text.
set -eu
B=$(fc-list : file | grep -E 'DejaVuSans-Bold\.ttf|LiberationSans-Bold\.ttf|NotoSans-Bold\.ttf' | head -1 | cut -d: -f1)
R=$(fc-list : file | grep -E 'DejaVuSans\.ttf|LiberationSans-Regular\.ttf|NotoSans-Regular\.ttf' | head -1 | cut -d: -f1)
ffmpeg -v error -y -i "$1" -vf "pad=iw:ih+160:0:0:black,\
drawtext=fontfile=$B:text='Claude Opus 5.5':fontsize=64:fontcolor=white:x=(w-tw)/2:y=h-148,\
drawtext=fontfile=${R:-$B}:text='Claude Code · three.js WebGPU':fontsize=30:fontcolor=0xdddddd:x=(w-tw)/2:y=h-62" "$2"
