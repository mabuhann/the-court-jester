<p align="center">
  <img src="assets/jester_logo.png" alt="The Court Jester logo" width="240">
</p>

# The Court Jester

A Chrome extension that drops an animated jester into web pages to cause mild chaos.

## Demo

<p align="center">
  <a href="./Court Jester Demo.mp4">
    <img src="assets/jester_logo.png" alt="Click to play the Court Jester demo video" width="320">
  </a>
</p>
<p align="center">
  Click the image to play the demo
</p>

## Features

- Animated idle, run, clap, and dance states
- Popup controls to enable or disable the jester
- Optional "Make it Worse" mode
- Random behaviors and proclamations on normal web pages
- Pixel-art sprite rendering with normalized frame playback

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
