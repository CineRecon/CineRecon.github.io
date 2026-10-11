# CineRecon project website

Static project website for **CineRecon: Benchmarking Frontier Models for Agentic Cinematic Reconstruction**.

## Preview locally

Run `python3 -m http.server 8000` from this directory and open http://localhost:8000.
Use an HTTP server so browser modules, JSON, and scene data can load.

## Deploy

In this repository's Settings → Pages, select **Deploy from a branch**, choose the published branch, and select **/ (root)**. The `.nojekyll` file keeps this site static.

The interactive scene loads a compressed payload split into ordered binary parts. Keep `assets/scene-parts.json` and its referenced files together.

Three.js license: [`vendor/LICENSE`](vendor/LICENSE).
