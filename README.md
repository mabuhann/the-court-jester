<p align="center">
  <img src="assets/jester_logo.png" alt="The Court Jester logo" width="180">
</p>

# The Court Jester

A Chrome extension that drops an animated jester into web pages to cause mild chaos.

## Features

- Animated idle, run, clap, and dance states
- Popup controls to enable or disable the jester
- Optional "Make it Worse" mode
- Random behaviors and proclamations on normal web pages
- Pixel-art sprite rendering with normalized frame playback

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

## Development

After changing files:

1. Save your changes
2. Open `chrome://extensions`
3. Click `Reload` on the extension
4. Refresh the tab you are testing on

## Notes

- The extension runs on normal web pages only, not `chrome://` pages
- To publish publicly, you may want to add screenshots and a license
