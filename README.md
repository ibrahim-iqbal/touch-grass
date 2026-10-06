# touch grass

voice dares that get you outside. say how much time and energy you have,
it gives you a short outdoor dare, you snap a photo as proof when you're done.

built for the hacktoberfest open-source ai challenge, week 1: "touch grass."

## why open

- dare generation runs on-device with [gemma 3 270m](https://huggingface.co/onnx-community/gemma-3-270m-it-ONNX) via transformers.js, not a hosted api
- works after the first load even with no signal — service worker caches the page and the model
- nothing you say or type leaves your browser; your hugging face token and elevenlabs key (both optional) are stored locally and used directly from your device
- swap the model, edit `dares.json`, or rip out the generation step entirely — it's all plain js

## running it

just a static site, no build step.

```bash
python3 -m http.server 8000
```

open `localhost:8000`. voice input needs chrome or edge (web speech api support
is patchy elsewhere). camera proof needs https or localhost.

## settings

open the gear icon to optionally add:
- a hugging face token, to enable live dare generation with gemma 3 270m
- an elevenlabs api key, for nicer voice output

without either, it falls back to a curated dare list and your browser's
built-in voice — still fully usable, just less smart.

## icon

`icon.svg` is the favicon and manifest icon — all modern browsers and
Android accept SVG there directly. `icon-180.png` is a rasterized copy for
iOS Safari's "Add to Home Screen", which ignores SVG. If the icon design
changes, re-export `icon-180.png` from `icon.svg` at 180x180.
