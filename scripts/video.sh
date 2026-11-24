#!/usr/bin/env bash
# Usage: [WORKTIME=0.5] [FPS=30] scripts/video.sh <final.png> <iterDir> <outDir>
# iterDir: iter01.png iter02.png ... + meta.txt lines "iter minutes score". Makes 60s mp4s at 1000x1200 and 1600x1000.
set -eu
final=$1; idir=$2; out=$3; mkdir -p "$out"
FPS=${FPS:-30}; WT=${WORKTIME:-0.5}
B=$(fc-list : file | grep -E 'DejaVuSans-Bold\.ttf|LiberationSans-Bold\.ttf|NotoSans-Bold\.ttf' | head -1 | cut -d: -f1)
R=$(fc-list : file | grep -E 'DejaVuSans\.ttf|LiberationSans-Regular\.ttf|NotoSans-Regular\.ttf' | head -1 | cut -d: -f1)
mapfile -t iters < <(ls "$idir"/iter[0-9]*.png | sort -V); N=${#iters[@]}
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mins() { awk -v i="$1" '$1==i{print $2}' "$idir/meta.txt" 2>/dev/null | head -1; }
printf '%s' "Realistic 3D head · built from scratch in three.js WebGPU" > "$T/cap"
printf '%s' "This is the first iteration" > "$T/card"
printf '%s' "Claude Opus 5.5" > "$T/t1"
printf '%s' "Agent: Claude Code · Tools: three.js, Chromium headless, ffmpeg · Work time: $WT h" > "$T/t2"
for i in $(seq 1 $N); do printf 'Iteration %d' $i > "$T/it$i"; printf '+%s min' "$(mins $i)" > "$T/mn$i"; done

render() { # W H
  local W=$1 H=$2 BH=$(( $2 / 16 * 2 )); local CH=$((H-BH)) FS=$((W/13)) per
  per=$(echo "13/$N" | bc -l)
  local fit="scale=$W:$CH:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=$W:$CH:(ow-iw)/2:(oh-ih)/2:color=0xcfe3f5,setsar=1,fps=$FPS,format=yuv420p"
  local lbl="fontfile=$B:fontsize=$FS:fontcolor=0xffe600:borderw=5:bordercolor=0x202020"
  local args=(-framerate $FPS -loop 1 -t 40 -i "$final") fc="" cat=""
  # 0-40s: ken burns on final + fading caption
  fc+="[0:v]scale=$((W*2)):$((CH*2)):force_original_aspect_ratio=decrease:force_divisible_by=2,pad=$((W*2)):$((CH*2)):(ow-iw)/2:(oh-ih)/2:color=0xcfe3f5,setsar=1,"
  fc+="zoompan=z='1+0.12*on/$((40*FPS))':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${W}x${CH}:fps=$FPS,trim=duration=40,format=yuv420p,"
  fc+="drawtext=fontfile=$R:textfile=$T/cap:fontsize=$((W/30)):fontcolor=0x1a2a3a:box=1:boxcolor=white@0.7:boxborderw=14:x=(w-tw)/2:y=h-th-40:alpha='min(1,max(0,(t-1.5)/1.5))'[s0];"
  cat+="[s0]"
  # 40-42s: card over iter01
  args+=(-framerate $FPS -loop 1 -t 2 -i "${iters[0]}")
  fc+="[1:v]$fit,drawtext=fontfile=$B:textfile=$T/card:fontsize=$((W/18)):fontcolor=white:box=1:boxcolor=0x1a2a3a@0.75:boxborderw=24:x=(w-tw)/2:y=(h-th)/2,"
  fc+="drawtext=$lbl:textfile=$T/it1:x=w-tw-40:y=h/2-th-$((CH/5)),drawtext=$lbl:textfile=$T/mn1:x=w-tw-40:y=h/2+$((CH/5))[s1];"
  cat+="[s1]"
  # 42-55s: all iterations, then 55-60s last iteration
  local k=2
  for i in $(seq 1 $N); do
    local d=$per; [ $i -eq $N ] && d=$(echo "$per+5" | bc -l)
    args+=(-framerate $FPS -loop 1 -t "$d" -i "${iters[$((i-1))]}")
    fc+="[$k:v]$fit,drawtext=$lbl:textfile=$T/it$i:x=w-tw-40:y=h/2-th-20,drawtext=$lbl:textfile=$T/mn$i:x=w-tw-40:y=h/2+20[s$k];"
    cat+="[s$k]"; k=$((k+1))
  done
  fc+="${cat}concat=n=$k:v=1:a=0,trim=duration=60,pad=$W:$H:0:0:black,"
  fc+="drawtext=fontfile=$B:textfile=$T/t1:fontsize=50:fontcolor=white:x=(w-tw)/2:y=h-$BH+($BH-90)/2,"
  fc+="drawtext=fontfile=$R:textfile=$T/t2:fontsize=$((W/50)):fontcolor=0xcccccc:x=(w-tw)/2:y=h-$BH+($BH-90)/2+66[v]"
  ffmpeg -v error -y "${args[@]}" -filter_complex "$fc" -map "[v]" -r $FPS -c:v libx264 -preset veryfast -crf 20 \
    -pix_fmt yuv420p -movflags +faststart "$out/opus5.5_claudecode_threejs_showcase_${W}x${H}.mp4"
}
render 1000 1200 & p1=$!
render 1600 1000 & p2=$!
wait $p1; wait $p2
ls -la "$out"/*.mp4
