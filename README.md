<p align="center">
  <img src="assets/jester_logo.png" alt="The Court Jester logo" width="240">
</p>

# The Court Jester

A Chrome extension that drops an animated jester into web pages to cause mild chaos.

## Demo

- Watch the recorded demo: [`Court Jester Demo.mp4`](<./Court Jester Demo.mp4>)
- Try the interactive local preview: [`demo.html`](./demo.html)

## Features

- Animated idle, run, clap, and dance states
- Popup controls to enable or disable the jester
- Optional "Make it Worse" mode
- Random behaviors and proclamations on normal web pages
- Pixel-art sprite rendering with normalized frame playback

## What It Does (Runtime Summary)

- Injects `content.js` + `content.css` into normal web pages via `manifest.json:17`, `manifest.json:20`, `manifest.json:21`.
- Creates fixed-position DOM layers: the jester sprite root, speech bubble, top banner, and a brief chaos veil in `content.js` (root/veil creation starts at `content.js:111` and `content.js:124`) styled by `content.css:1`.
- Runs a randomized behavior loop (movement + messages) from `content.js:449` through `content.js:584`, scheduled via `content.js:664` / `content.js:672` and enabled by `content.js:711`.
- Uses a prank hook that pauses actively-playing `<video>` elements on the page (if found) in `content.js:621`, with more frequent checks in worse mode (`content.js:641`).

## Sprite Sheets, When They’re Used, And How Big They Render

### Sprite sheet files (all occurrences in this repo)

- `assets/jester_idle_normalized.png`: `content.js:17`, `sprite_preview.html:243`
- `assets/jester_running_normalized.png`: `content.js:18`, `sprite_preview.html:248`
- `assets/jester_clapping_normalized.png`: `content.js:19`, `sprite_preview.html:253`
- `assets/jester_dancing_normalized.png`: `content.js:20`, `sprite_preview.html:258`
- `assets/jester_logo.png`: `README.md:2`, `popup.html:13`, `manifest.json:13`, `manifest.json:14`, `manifest.json:32`, `manifest.json:33`, `sprite_preview.html:209`

### Which code “calls” which sprites (extension runtime)

- Sprite sources + animation rates + scaling are configured in `content.js:16` through `content.js:20`.
- `enable()` starts the jester in `idle` (`content.js:711`, `content.js:716`) and then schedules random behaviors (`content.js:664`, `content.js:672`).
- Behavior-to-sprite mapping (the main state transitions):
  - `runAcrossScreen()` uses `run` then returns to `idle` (`content.js:449`, `content.js:461`, `content.js:468`).
  - `danceInCorner()` uses `run` then `dance` then `idle` (`content.js:473`, `content.js:486`, `content.js:491`, `content.js:502`).
  - `clapRandomly()` uses `run` then `clap` then `idle` (`content.js:507`, `content.js:515`, `content.js:520`, `content.js:533`).
  - `centerDistraction()` uses `run` then `dance` then `run` then `idle` (`content.js:549`, `content.js:555`, `content.js:562`, `content.js:574`, `content.js:580`).
  - `royalTantrum()` stacks `run` + `dance` + `run` + `idle` and triggers extra chaos effects (`content.js:584`, `content.js:592`, `content.js:597`, `content.js:607`, `content.js:614`).

### Dimension rules (how width/height are computed)

- Each sprite sheet is loaded from the extension bundle with `chrome.runtime.getURL(...)` in `content.js:88` and `content.js:275`.
- The sprite engine analyzes the visible pixel bounds per frame to compute a consistent stage box:
  - `analyzeSprite()` computes `stageWidth` and `stageHeight` (`content.js:211`, `content.js:212`).
  - `preloadSprite()` turns that into final on-screen pixel sizes with scaling:
    - `stageWidth = round(metrics.stageWidth * scale)` (`content.js:269`)
    - `stageHeight = round(metrics.stageHeight * scale)` (`content.js:270`)
- When the state changes, `applyJesterState()` applies those dimensions to the DOM:
  - Sets `#court-jester` width/height and the root container size (`content.js:309` through `content.js:314`).
- Until sprites are loaded, movement code falls back to `state.jesterWidth = 80` and `state.jesterHeight = 100` (`content.js:68`, `content.js:69`), referenced by behaviors like `runAcrossScreen()` (`content.js:453`, `content.js:454`).

## Live Demo

Open `demo.html` locally in Chrome to see the extension behavior without installing it.
The demo simulates all four jester states (idle, run, clap, dance), the full behavior loop,
the speech bubble, top banner, chaos veil, and the video-pause prank on the YouTube mockup.

## Install Locally

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select this folder:
   `/the-court-jester`

## How To Use

1. Open any `http://` or `https://` page
2. Click the extension icon
3. Toggle the jester from `Dormant` to `Unleashed`
4. Optionally click `Make it Worse`

## Project Files

- `manifest.json`: Chrome extension manifest
- `background.js`: service worker and default storage setup
- `content.js`: main in-page jester behavior and animation logic
- `content.css`: injected styles for the jester, bubble, and banner
- `popup.html`: extension popup UI
- `popup.js`: popup logic and content-script messaging
- `assets/`: sprite sheets and images
- `sprite_preview.html`: local sprite preview page
- `browser_demo.html`: staged in-page demo of the current behaviors
- `ad_mockup.html`: animated laptop + Chrome + YouTube mock ad storyboard

## Development

After changing files:

1. Save your changes
2. Open `chrome://extensions`
3. Click `Reload` on the extension
4. Refresh the tab you are testing on

## Notes

- The extension runs on normal web pages only, not `chrome://` pages
- To publish publicly, you may want to add screenshots and a license
