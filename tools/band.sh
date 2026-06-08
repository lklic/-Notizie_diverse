#!/bin/zsh
# .crops/band.sh NNN [NBANDS]  -> .crops/NNN_b1.jpg ... (default 3 bands, ~1/6 overlap)
n=$1; nb=${2:-3}
src="jpeg-small/32044103438974_${n}.jpg"
read W H <<< $(magick identify -format "%w %h" "$src")
step=$(( H / nb )); ov=$(( step / 6 ))
k=1; y=0
while [ $k -le $nb ]; do
  bh=$(( step + ov )); [ $(( y + bh )) -gt $H ] && bh=$(( H - y ))
  magick "$src" -crop ${W}x${bh}+0+${y} +repage ".crops/${n}_b${k}.jpg"
  y=$(( y + step )); k=$(( k + 1 ))
done
