# GMod Wiki Mirror

This project scrapes and mirrors the GMod Wiki.

It uses AstroJS to do the templating/building.

The scraper then builds the appropriate `.astro` and `.json` files for all of the pages.
The build script dynamically modifies things like styles, scripts, html to optimize for cloud hosting.

## Features
- Full DarkReader support!
- Loading and in-browser performance enhancements over the original
- Memory usage improvements
- Full 1:1 styling with the original
- Search bar works fast for basic searching
- All images mirrored and optimized
- Hosted entirely on the cloud
- Automatic content updates every three days
- `?format=json` support _(redirects to `.json` which is how all the page contents are stored now)_

## Limitations
Current limitations:
- No full search (planned - doable)
- No Editing (will not implement)
- No change history (probably won't implement)
- `/Enums/ACT` and `HL2_Sound_List` pages are excluded as they ballooned the final bundle size too much
- Links to unmirrored pages blur the page and do nothing
- The main page script.js is self-hosted and modified (for performance), meaning any useful updates will need to be manually backported
