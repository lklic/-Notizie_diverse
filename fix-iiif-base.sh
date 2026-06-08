#!/bin/zsh
# Rewrite the IIIF manifest base URL if deploying somewhere other than GitHub Pages.
# usage: ./fix-iiif-base.sh https://your.domain/path
old="https://lklic.github.io/-Notizie_diverse"; new="$1"
[ -z "$new" ] && echo "give new base url" && exit 1
sed -i "" "s|$old|$new|g" manifest.json && echo "manifest base -> $new"
