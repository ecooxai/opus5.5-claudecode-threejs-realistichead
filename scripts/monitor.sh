#!/usr/bin/env bash
# Usage: scripts/monitor.sh <logfile> -- <cmd...>   samples total CPU% and used RAM MB every 1s.
set -u
log=$1; shift; [ "${1:-}" = "--" ] && shift
cpu() { read -r _ u n s i w x y z _ < /proc/stat; echo "$((u+n+s+x+y+z)) $((u+n+s+x+y+z+i+w))"; }
mem() { awk '/MemTotal/{t=$2}/MemAvailable/{a=$2}END{print int((t-a)/1024)}' /proc/meminfo; }
echo "time cpu% ram_mb" > "$log"
start=$(date +%s.%N)
"$@" & pid=$!
(
  read -r b0 t0 < <(cpu)
  while kill -0 $pid 2>/dev/null; do
    sleep 1; read -r b1 t1 < <(cpu); dt=$((t1-t0)); [ $dt -gt 0 ] || dt=1
    echo "$(date +%T) $(( (b1-b0)*100/dt )) $(mem)" >> "$log"; b0=$b1; t0=$t1
  done
) & mon=$!
wait $pid; rc=$?; wait $mon 2>/dev/null
el=$(echo "$(date +%s.%N) - $start" | bc)
awk -v el="$el" 'NR>1{if($2>c)c=$2; if($3>r)r=$3}END{printf "peak CPU %d%%  peak RAM %d MB  elapsed %.1fs\n",c,r,el}' "$log" | tee -a "$log"
exit $rc
