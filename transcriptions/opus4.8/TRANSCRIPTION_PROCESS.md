# Transcription Project — Process, Methodology & Findings

**Object:** digitised manuscript `32044103438974` — a Florentine merchant's reference notebook of the Frescobaldi family.
**Deliverable:** a diplomatic (semi-diplomatic) transcription of all 69 page images, one Markdown file per image, in `transcriptions/opus4.8/`.
**Source images:** `jpeg-small/32044103438974_001.jpg … _069.jpg` (69 files, ~5–6 MB each, ~3500 × 4800 px).
**Date of work:** 5 June 2026.

This document records *how* the transcription was produced — including intermediate steps, the reasoning behind key decisions, the tooling, the problems encountered (notably a mid-job drive disconnection), and the substantive conclusions about the manuscript. It is a companion to `README.md` (which holds the editorial conventions and the page index).

---

## 1. Objective and initial assessment

The request was to read every image in `jpeg-small/`, produce a **diplomatic transcription** preserving formatting, with annotations, in `transcriptions/opus4.8/` as Markdown. The user characterised the book as a hard-to-read Renaissance manuscript — an old account book of the Frescobaldi family.

**First steps (exploration):**
1. Listed `jpeg-small/` → **69 images**, sequentially numbered `_001`–`_069`.
2. Checked pixel dimensions (`sips -g pixelWidth pixelHeight`) → large (e.g. 3751 × 4731), but file sizes and resolution vary slightly per image.
3. Read the first images at full-page scale to identify the document:
   - **Image 001** (cover): later 18th-century archival hand — *"Libro N° 22 Spogliato — Notizie diverse raccolte da [S]toldo Frescobaldi d[e]l'Esercizio della Mercatura circa i generi, pesi, misure, valore, e Ragguagli d'una Piazza all'altra"*, with inventory number `14019`.
   - **Image 003** (f. 1r): ownership line in mercantesca — *"Questo libro X di Stoldo di Lionardo Fresc[obaldi]"*.
   - **Images 005–006**: the dense body begins — Florentine **mercantesca** commercial cursive, heavily abbreviated.

**Identification & dating reasoning.** The hand, vocabulary (*ragguagli*, *cambio*, *spezierie*, weights/measures), and the Barcelona-pivoted western-Mediterranean focus identify it as a *manuale di mercatura* / *zibaldone mercantile*. Internal dates fix the period: cloth bale-manifests dated **1419** (ff. 14r, 17r), and a copied Pisan customs statute dated **1470[?]** (f. 28v). The compiler is **Stoldo di Lionardo Frescobaldi**.

---

## 2. The core technical problem: legibility vs. image downsampling

Reading the **full-page** images directly was insufficient: the image-reading pipeline downsamples large images, and at that scale the abbreviated mercantesca is not reliably legible. The solution was to **crop each page into full-resolution horizontal bands** and read those.

### 2.1 A false start with `sips`
- macOS `sips` was tried first for cropping. Two problems surfaced:
  - Writing crops to `/tmp` failed (`Error 13: Cannot rename temporary file` — a `/private/tmp` permissions issue). Fixed by writing crops into a workspace folder (`.crops/`).
  - More seriously, `sips -c H W --cropOffset Y X` did **not** anchor at the visual top-left as expected: an offset of `0,0` returned content from the *middle* of the page. Empirical strip tests confirmed the crop origin was unreliable (no EXIF orientation tag was present, so the cause was `sips`'s own crop-anchoring behaviour). This made banded coverage untrustworthy.

### 2.2 Switching to ImageMagick (well-defined geometry)
- `magick` (ImageMagick 7.1.2) was available. Its `-crop WxH+X+Y +repage` has a well-defined **top-left origin**, which produced correct, predictable bands (verified by the folio number "2" appearing at the true top-right of the first band).

### 2.3 The `band.sh` helper
A small helper was written to crop any page into N overlapping vertical bands at native resolution:

```zsh
# .crops/band.sh NNN [NBANDS]  → .crops/NNN_b1.jpg … (default 3 bands, ~1/6 overlap)
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
```

- Standard reading unit: **3 bands** (top/middle/bottom) per page, with overlap so no line is lost at a seam.
- For especially dense leaves, **4 bands** were used.
- For individual hard lines/headings, ad-hoc crops were made directly, e.g.:
  `magick jpeg-small/..._005.jpg -crop 3545x650+0+200 +repage .crops/005_head.jpg`

`.crops/` was treated as **scratch space** and deleted at the end of the project.

---

## 3. Workflow decisions and the dialogue with the user

### 3.1 Per-page files
Chosen layout: **one Markdown file per facsimile image**, `page_NNN.md`, matching `32044103438974_NNN.jpg`. Rationale: it mirrors a scholarly facsimile-and-transcription edition, is resilient to interruption, and makes verification trivial. (This was also explicitly confirmed by the user.)

### 3.2 Fidelity expectations
A mid-task check-in was raised because high-fidelity, word-for-word transcription of this hand at this image quality is not fully achievable — much of the connective prose is genuinely ambiguous. The decision (endorsed by the user, who asked that the page simply be read in full) was:
- **Read each page directly and transcribe confidently**, but
- **mark genuine uncertainty honestly** with `[?]` and illegible passages with `[…]`, rather than inventing plausible text.

Reliable elements: place-names, commodities, numbers, units, quality terms, and page structure. Least reliable: the abbreviated linking prose.

### 3.3 Editorial conventions
A consistent set was defined and documented in `README.md`:
`(word)` = expansion of an abbreviation; `[word]` = reconstruction of lost letters; `[?]` = uncertain reading; `[…]` = illegible; `[blank]` = unwritten; `⟨ ⟩` = interlinear/marginal addition; `※` = the scribe's looping entry-initial; weights/money transcribed as written (`lb`, `on/once`, `s.`, `d.`, `fl./f.`, `gr.`), original spelling preserved (e.g. `ony`=ogni, `Barzalona`, `Fiorenza`).

### 3.4 Parallelisation with subagents
The book is 69 dense pages; sequential transcription would be very slow. After hand-transcribing the front matter and the two hardest opening folios (pages 001–006) to establish the conventions and the reading workflow, the remainder was **divided across five worker subagents**, each given a disjoint page range plus the full methodology and conventions:

| Worker | Pages | Status |
|---|---|---|
| (me) | 001–006 | done by hand |
| A | 007–019 | completed |
| B | 020–032 | completed |
| C | 033–045 | completed (see incident §4) |
| D | 046–058 | completed except 058 (see §4) |
| E | 059–069 | completed |

Each worker prompt specified: the manuscript context; the `band.sh` reading workflow; the exact `page_NNN.md` output structure; the editorial conventions; common decodings (e.g. *ghattivo/ghattde* = cattivo/cattive; *buone*, *fine*, *grosse*; *peso*; *spesa/difesa*; *sporto*; *torna(no)*; *vale*); and the instruction to capture every legible token and not skip lines.

---

## 4. Incident: external drive disconnection and recovery

Midway through, the external volume hosting the project, `/Volumes/Digital-Archive`, **spontaneously unmounted**.

**Symptoms & diagnosis:**
- Worker D reported it could not finish page 058 because the drive vanished; worker C was still running.
- A shell command hung with no exit status — because the shell's working directory was *on the now-missing volume*. Subsequent commands were run with an explicit `working_directory` of `/Users/lklic` to recover.
- `ls /Volumes/` showed only `Archive` and `Macintosh HD` — `Digital-Archive` was gone.

**Reasoning / actions while blocked:**
- Determined no work could proceed (source images and output files both lived on the missing volume) and asked the user to remount the drive. Did **not** attempt destructive workarounds.

**Remount confusion:**
- When the user reconnected, `/Volumes/` first showed a *different* volume, `Digiteca` (containing TIFFs and `Artwork_Matches` databases) — **not** the project drive. A bounded search confirmed the book was not on `Digiteca` or `Archive`.
- Shortly after, `Digital-Archive` re-appeared in `/Volumes/` under its original name, and the project files were intact.

**Damage assessment & recovery:**
- Inventory after remount: **65 of 69** `page_*.md` present; none empty or truncated (verified by byte-size scan; `page_057.md` is legitimately a blank-page stub).
- **Missing: 043, 044, 045** (worker C's tail, which had not flushed before the unmount) and **058** (worker D, explicitly blocked).
- These four were transcribed by hand using the same `band.sh` workflow:
  - **043** (f. 21r) — Sardinia / Rome / Naples-Gaeta survey.
  - **044** (f. 21v) — Messina-Sicily / Bologna / Milan survey.
  - **045** (f. 22r) — Milan cont.; Provence/Avignon survey.
  - **058** (f. 28v) — the Pisan *gabella* statute (7 *capitoli*, 1470?).
- **Note on overlap:** worker C had in fact survived the disconnection and *also* finished 033–045, reporting success after the manual recovery. Both its versions of 043–045 and the manual versions are valid transcriptions of the same leaves; whichever wrote last is on disk. A final check confirmed all four files are well-formed, non-truncated, and carry the correct headings/folios. No data loss, no completeness conflict.

---

## 5. Verification

- **Completeness:** scripted check that `page_001.md … page_069.md` all exist (no gaps) → **69/69 present**.
- **Integrity:** byte-size scan for empty/truncated files → none (`page_057.md` small but intentionally blank).
- **Index consistency:** page headings (folio labels) were extracted and cross-checked against the README index table.
- **Cleanup:** the `.crops/` scratch folder (helper + thousands of band JPEGs) was removed. Final deliverable: **70 files** = `README.md` + `TRANSCRIPTION_PROCESS.md`(this) + 69 page files. *(README count of 70 was taken before this process file was added.)*

---

## 6. What the manuscript contains (substantive findings)

A Florentine merchant's working reference book, organised in thematic blocks:

1. **Wool & spice gazetteers** (ff. 2–4): qualities, quantities (`lb`), weights and duties of wools (*lane*) and *spezierie*, town by town — heavily Catalan/Aragonese/Valencian (Villafranca, Villa Nuova, Villa Formosa, Perpignan, etc.). Quality scale: *buone* (good) / *hominali* (ordinary) / *ghattde, ghattu nissimo* (cattive/cattivissimo, bad/very bad) / *fine* / *grosse*.
2. **Ragguagli — cross-market conversion tables** (ff. 4–9 and again ff. 22–26): weights, lengths (canna, palmo), money and price-equivalents of one marketplace against another, pivoting on **Barcelona**. Covers Perpignan, Montpellier, Avignon, Paris, Bruges, London, Savona, Pisa, Florence, Granada, Palermo, Venice, Majorca/Minorca, Ibiza, Seville, then the **Levant**: Alexandria, Damascus, Cyprus, Constantinople (with *bisanti*, *aspri*, *rotoli*, *cantaro grosso/sottile*).
3. **Cloth & dye references** (ff. 12–15): cargo/packing manifests of woolen *panni* (some dated 1419), grade lists (palmelle, mezzi, vari), dyeing surcharges by colour (azzurro, biadetto, turchino, scarlattino, pagonazzo), and Florentine silk price-lists (velvets/*zetani*, *domaschini*, taffetas, satins). Also a large **units-of-sale glossary** (by balance / gross pound / ounce / cantaro / dozzina / pezza / balla / centinaio).
4. **Coinage assays** (f. 16): fineness tables of gold (*fiorini* of Florence, Genoa, Siena, Bologna, Milan, Padua, papal, etc.) and silver coins.
5. **Genoa- and Florence-centred metrology & *cambio*** (ff. 18–22): how goods are weighed and money exchanged "a Genova"/"a Firenze," with full city-by-city *cambio* rate tables ("sehondo tempi"), plus a regional survey of Italy — **Sardinia, Rome (moneta di camera), Naples/Gaeta (carlini/tarì/grani), Sicily/Messina (cantaro), Bologna, Milan, Provence/Avignon/Marseille**.
6. **Trade-fair calendars & bill-of-exchange usances** (ff. 26–27): the *fiere* of Europe by city/month, and the *tempi delle lettere del cambio* (usance/maturity periods) drawn between the major markets, with the recurring closing formula read as *"è uso paese."*
7. **Statutory texts** (ff. 28–29): the **Pisan *gabella*** customs law in numbered *capitoli* (entry/exit duty, Levante/Ponente, transit through Lombardy/Romagna, four-month re-export exemption, sureties by Florentine and Pisan merchants), and a salt-tax/gabella statute.
8. **Maritime / galley memoranda** (ff. 30 and the late "f. 71"): *soldamento d'una galea* (galley wages and manning — comito, calafato, maestro d'ascia, barbiere, remolaio, crew of 18), a *Nota* on manning/outfitting, and a *Provedimento alla galea* provisioning checklist (arms, crossbows, mast, wheat, wine, vinegar, cheese, salt, *insalata*).
9. **Blanks & binding** (end leaves, flyleaves, spine): several blank leaves (one with a circle-and-cross/flower watermark), the rear parchment flyleaf, the inside rear cover (shot with a colour-calibration strip), and the limp-vellum spine.

---

## 7. Open problems and caveats

- **Reliability.** This is dense, abraded *mercantesca* with very heavy abbreviation. The transcription is a careful **best-effort reading**, not a definitive critical edition. Place-names, numbers, units and structure are the most secure; the connective prose is the most provisional and is flagged with `[?]`/`[…]`. It should be checked by a trained paleographer (ideally against higher-resolution scans).
- **Foliation inconsistency.** The scribe's own folio numbers are irregular in the ff. 4–6 stretch (an apparently repeated "6r"; some versos unnumbered), and there is a jump to **"f. 71"** near the end (image 063). Uncertain folio labels carry `[?]` in both the page files and the README index.
- **Undeciphered recurring tokens.** Two formula-words recur and remain unresolved: the entry-closing token rendered **"o panstola[?]"** (frequent in the wool/spice tables on ff. 2–2v) and a section rubric read **"sismona[?]"** (a French/Provençal fair-town in the Avignon block, f. 22r). These are transcribed as seen and flagged.
- **Worker-overlap artefact.** Pages 043–045 exist in two independently produced readings (manual recovery + worker C); the on-disk version is internally consistent and complete, but the two readings may differ in detail on uncertain words.

---

## 8. Tools and environment

- **Image cropping:** ImageMagick 7.1.2 (`magick`, `magick identify`) via `.crops/band.sh`. (`sips` rejected for unreliable crop anchoring.)
- **Image reading:** full-page reads for layout + native-resolution band reads for legibility.
- **Orchestration:** five parallel worker subagents over disjoint page ranges, plus hand-transcription of the front matter and the post-incident recovery pages.
- **Verification & cleanup:** shell (`zsh`) for inventory/integrity checks and removal of scratch crops; a short Python snippet to extract per-page topic lines for the index.
- **Storage:** external volume `/Volumes/Digital-Archive` (which disconnected once mid-job; see §4).

---

## 9. File inventory (final)

```
transcriptions/opus4.8/
├── README.md                  # metadata, editorial conventions, contents-at-a-glance, page index
├── TRANSCRIPTION_PROCESS.md   # this document
└── page_001.md … page_069.md  # one diplomatic transcription per facsimile image
```
