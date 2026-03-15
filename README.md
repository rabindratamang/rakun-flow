This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit it.

## Testing on Apple devices (iPhone / iPad)

After HLS or player changes, validate on real devices:

1. **iPhone Safari**: uses native HLS; load a stream and confirm it starts (or tap Play if autoplay is blocked).
2. **iPad Safari**: uses hls.js when supported (proxy Range/206 and HEAD apply); same checks as above.
3. Test with at least: a plain `.m3u8` stream, an encrypted HLS stream (`EXT-X-KEY`), and an fMP4 stream using `EXT-X-MAP`; if available, a byte-range playlist.
4. Confirm: no perpetual loading spinner, tap-to-play works when autoplay is blocked, and playback/seek probes succeed.
5. **Regression**: verify the same streams still work in Chrome/Edge (hls.js path).

The stream proxy supports optional query params `origin` and `referer` for upstream requests when required by the provider (e.g. `?url=...&origin=https://example.com&referer=https://example.com/`).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
