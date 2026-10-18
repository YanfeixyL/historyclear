# history clear

A compact Chrome Manifest V3 extension for finding and removing selected browser history.

## Features

- Search saved URLs and page titles by keyword.
- Select individual results or click **Select all**.
- Remove selected history in one click.
- Clear all history from a separate, confirmed action.
- Local only: no network requests and no data collection.

## Install

1. Open `chrome://extensions/` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Choose this folder, the one containing `manifest.json`.

The ZIP archive can be extracted first and then loaded as an unpacked extension.

## Note

Chrome's history API searches saved URLs and page titles. It does not search page body text because page content is not stored in browser history.
