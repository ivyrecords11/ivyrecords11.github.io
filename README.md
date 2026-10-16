# IVY — A small digital garden

A botanical portfolio of ivyrecords11's public GitHub projects. Buildless HTML, CSS, JavaScript and procedural SVG artwork.

## Local preview

Run `python -m http.server 4173` from this directory, then open http://localhost:4173.

## Publish

GitHub Pages serves the root of the `main` branch at https://ivyrecords11.github.io/.
Commit changes to `main` to update the site. No build tools or secrets are needed.

## Automatic published-site list

GitHub Actions checks public, non-fork repositories every hour and lists projects whose GitHub Pages status is `built`. Private, archived, and forked repositories are excluded. To update the list right away, open the repository's **Actions** tab, select **Sync published project sites**, and choose **Run workflow**. The sync script uses the built-in GitHub Actions token; no personal access token or repository secret is needed.

The project cards are curated separately. Edit the `projects` array in `app.js` to change their descriptions, categories, and links.

Typography uses Google Fonts with local serif/sans-serif fallbacks. All illustrations are local procedural SVG; the site remains functional without external fonts.
