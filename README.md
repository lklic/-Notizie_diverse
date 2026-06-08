# Notizie diverse — a Florentine merchant's world (c. 1417–1429)

An interactive digital edition of the **Frescobaldi mercantile notebook**
*"Notizie diverse raccolte nell'esercizio della mercatura circa i generi, pesi,
misure, valore e Ragguagli da una Piazza all'altra"* — Stoldo di Leonardo
Frescobaldi, Florence, 1417–1429 (Harvard Library, barcode `32044103438974`,
HOLLIS `990150284390203941`).

The site presents a fresh **diplomatic transcription** and **English translation**
of all 69 imaged leaves, alongside a deep-zoom IIIF facsimile, a page-turnable
virtual book, faceted data exploration, and a map of the trade routes
(*ragguagli*) that connected the medieval Mediterranean — pivoting, as the
notebook does, on Barcelona.

## The site

| Page | What it does |
|---|---|
| `index.html` | Landing page — the book at a glance |
| `read.html` | **IIIF deep-zoom** (OpenSeadragon) beside the diplomatic transcription + translation, leaf by leaf (`?p=5`) |
| `browse.html` | **Page-turn facsimile** (StPageFlip) — the book as a physical object |
| `explore.html` | **Faceted filtering** by theme, commodity category, commodity, place, full-text search |
| `map.html` | **Trade-route map** (Leaflet) — marketplaces sized by frequency, *ragguaglio* lines, commodity highlighting |
| `about.html` | The manuscript, the method, editorial conventions, credits |

It is a **fully static site** (no server, no build step) and self-hosts IIIF:
Image API 2.0 Level-0 tiles under `iiif/`, plus a Presentation manifest
(`manifest.json`).

## Layout

```
index/read/browse/explore/map/about.html   pages
assets/css, assets/js                       styles + behaviour
data/*.json                                 published datasets (see below)
iiif/<NNN>/                                 self-hosted IIIF tiles + info.json
img/pages, img/thumbs                        medium + thumbnail derivatives
manifest.json                                IIIF Presentation manifest
transcriptions/opus4.8/page_NNN.md          the diplomatic edition, one file per leaf
tools/                                       reproduction scripts
.nojekyll                                    serve tile dirs verbatim on GitHub Pages
```

### Datasets (`data/`)
- `pages.json` — per-leaf transcription, translation, interpretive note, and normalized entities.
- `index.json` — lightweight leaf index (image, folio, topic, section, counts).
- `places.json` — geocoded marketplaces (modern name, lat/lon, frequency, leaves).
- `routes.json` — *ragguaglio* edges between marketplaces, with examples.
- `commodities.json` — goods by category, with leaves.
- `sections.json` — the twelve thematic blocks.

## Reproduce

```sh
# 1. zoom bands for transcription (needs the source images in jpeg-small/)
tools/band.sh 033 3

# 2. IIIF tiles (libvips)
for i in $(seq 1 69); do n=$(printf "%03d" $i); \
  vips dzsave jpeg-small/32044103438974_${n}.jpg iiif/${n} \
    --layout iiif --tile-size 512 --suffix '.jpg[Q=80]' --id "."; done

# 3. derived datasets
python3 tools/build_datasets.py
```

> **Note on `@id` portability.** Each `info.json` ships with `@id: "."`; the
> reader rewrites it to the real deployed location at runtime, so the viewer
> works at any path or domain. The Presentation manifest is generated with the
> GitHub Pages base URL — run `./fix-iiif-base.sh https://your.domain/path` to
> retarget it.

## Caveat

The transcription and translation were produced as a careful **best-effort
reading** of a dense, abraded *mercantesca* hand, with the help of an AI model
(Claude, Opus 4.8). Place-names, commodities, numbers, units and page structure
are the most secure; connective prose is the most provisional and is flagged
with `[?]` / `[…]`. It should be verified by a trained palaeographer against the
originals before being treated as authoritative.

Manuscript images © Harvard Library.
