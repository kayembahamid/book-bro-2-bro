# Bro 2 Bro — the notes page

The reading site at **brotobro.hamcodes.com**. It shows the whole book as
parchment notes that come forward out of the dark one after another, and links
to the GitBook for anyone who would rather read it as a book.

Nothing here is a copy of the book. The page is built **from the book's own
markdown**, the same files GitBook writes into this repo.

## How a change reaches the site

1. You edit a page in GitBook.
2. GitBook Git Sync commits that markdown to `main` in this repo.
3. The push runs `.github/workflows/deploy-site.yml`.
4. The workflow runs `node site/build-notes.js`, which reads `SUMMARY.md` and
   every page next to it and rewrites `site/notes.js`.
5. It uploads `site/` to Cloudflare Pages.

About a minute after you save in GitBook, the note is live on the site. You
never edit anything in `site/` to update the book.

## One time setup

**1. A Cloudflare API token.** In the Cloudflare dashboard: My Profile > API
Tokens > Create Token > "Edit Cloudflare Workers" template, or a custom token
with the **Cloudflare Pages: Edit** permission on your account.

**2. Two GitHub secrets.** In this repo: Settings > Secrets and variables >
Actions > New repository secret.

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | the long id in your Cloudflare dashboard URL |

**3. The custom domain.** After the first deploy, open the Cloudflare Pages
project `brotobro` > Custom domains > add `brotobro.hamcodes.com`. Cloudflare
adds the DNS record itself because hamcodes.com is already on your account.

That is it. Every later change is just a GitBook edit.

## Publishing by hand

If you ever want it live immediately without Actions:

```bash
./site/deploy.sh
```

## Files

| File | What it is |
|---|---|
| `build-notes.js` | reads the book, writes `notes.js`. The only file that knows about markdown |
| `notes.js` | generated. Every note, in reading order, with its GitBook link |
| `index.html` | the shell: bar, hero, contents drawer, end card |
| `styles.css` | the whole look. Colours live in `:root` at the top |
| `app.js` | builds the cards and drives the scroll motion |
| `404.html`, `robots.txt`, `sitemap.xml` | housekeeping for search engines |

## Changing how it looks

Open `styles.css`. The first block is the palette: `--maroon`, `--red`,
`--paper`, `--ink`. Change those four and the whole site changes with them.

## Which pages become notes

`build-notes.js` skips the housekeeping pages (copyright, table of contents,
the "read it in your language" and "read it via an app" pages). They stay in
the book, they just are not notes. The list is the `SKIP` set at the top of
the file. Remove a line to let a page back in.

## Reading controls

| Key | Does |
|---|---|
| `J` or arrow down | next note |
| `K` or arrow up | previous note |
| `C` | contents |
| `Esc` | close contents |

The site remembers where you stopped and offers to pick up there. A link like
`brotobro.hamcodes.com/#n24` opens straight on note 24.
