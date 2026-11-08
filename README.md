# nor(DEV) asset builder

A browser-only builder for nor(DEV) / nor(DEV):con marketing images. Pick a layout, fill in its
components, adjust any format that needs it, and download every size at once.

## Running

```bash
bun install
bun run fetch-model   # one-off: downloads the background-removal model into public/bg-removal
bun run dev
```

## Deploying (Dokploy)

Point Dokploy at this repo using the **Dockerfile** build type. The image builds the app, fetches
the model, and serves everything from nginx on port 80. There's no backend: projects are saved as
`.nordev.json` files, and the current work is autosaved in the browser (IndexedDB).

## How it fits together

| Concept | Where | What it is |
|---|---|---|
| **Brand** | `src/brand.ts`, `src/assets/*.svg` | Palette, fonts, logos/skyline/wave SVGs. Logo SVGs use `{{main}}` / `{{accent}}` colour tokens. |
| **Formats** | `src/formats.ts` | Output sizes. Each maps to an aspect class: `banner`, `landscape`, `square`, `portrait`, `tall`. |
| **Layouts** | `src/layouts/*.ts` | The templates. Each lists its components (paint order, bottom first) and a placement for each aspect class. |
| **Renderer** | `src/render/renderer.ts` | One pure canvas renderer used for previews and exports, so downloads match what you see. |

### Adding a layout

1. Copy one of `src/layouts/*.ts`.
2. Build the `components` list from the helpers in `src/layouts/parts.ts` (`background`, `skyline`, `wave`,
   `panel`, `logo`, `prepend`, `text`, `speakers`, `badge`, `graphic`). Mark one `optional: true` to give
   it an on/off switch, and set `enabled: false` to start it switched off.
3. Give each component a placement for each aspect class: `at([x, y, w, h], { align, valign, size, minSize, maxLines, below, gap })`.
   - Boxes are fractions of the canvas.
   - `size` is the font size as a % of the canvas's short side. Text shrinks toward `minSize` until it fits the box.
   - `below: 'title'` stacks a component under another one's rendered bounds, so subtitles follow titles of any length.
   - A missing aspect class falls back to the nearest one.
4. Register it in `src/layouts/index.ts`.

Per-format tweaks (drag, scale, hide) are saved in the project as overrides layered on top of the layout's placements.
