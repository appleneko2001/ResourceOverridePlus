# Resource Override Plus

## Disclaimer
The browser extension origin ([Resource Override by Kyle Paulsen](https://github.com/kylepaulsen/ResourceOverride)) is no more adding feature or improve, or even test pull request and merge them.
But I need some browser extension like this, so I clone this repository and do those works by myself, like implement some features that origin author didn't,
improve some feature, code style, etc.

The repository might be merged to origin repository, if origin author want me to make this happen.

## Overview
Resource Override is an extension to help you gain full control of any website by redirecting traffic, replacing, editing, or inserting new content.

## Features
+ Match domain by pattern or URL by regular expression 
+ Override script dynamically (URL to URL) with MutationObserver
+ Ruleset management
+ Logging to current tab console while overriding (you will know it does work or not easily)
+ Dark UI
+ Second storage API implementation (Chrome storage API) to store ruleset and options with sync support

## How to use it on your browser
### Chrome, Chromium (include ungoogled chromium or uses same ui as chrome)
1. Open Chrome extension manager page (chrome://extensions)
2. Enable developer mode to allow to install extension not from chrome store
3. Download this repository and extract files to a folder
4. Press "Load extracted extension" and choose folder which we extracted files to it
5. You can use it now. Go to options to manage domain and ruleset.

### Firefox (untested and might not support)

## Browser supports
Currently, I tested it on my ungoogled chromium (ver. 97.0.4692.71, Windows 10 21H1), you can try it on your own browser and submit issue freely if some features not work.

## Special thanks to
JetBrains open-source license, which allow me to use their IDE freely to contribute open-source community
