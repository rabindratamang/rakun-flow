import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HLS_M3U8 = "application/vnd.apple.mpegurl";
const HLS_M3U8_ALT = "application/x-mpegURL";
const MP2T = "video/MP2T";

/**
 * Proxies HLS (and segment) requests server-side to avoid CORS and follow redirects.
 * GET /api/stream?url=<encoded-url>
 * Optional: origin, referer — forwarded to upstream (or use request Origin/Referer when not provided).
 * For .m3u8 responses, rewrites segment/playlist URLs to go through this proxy.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const urlParam = searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(urlParam);
    new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
  }

  const origin = "https://pushembdz.store"
  const referer = `https://pushembdz.store/`

  const requestHeaders: Record<string, string> = {
    Accept: "*/*",
    "User-Agent": "RakunFlow/1.0",
  };
  if (origin) requestHeaders.Origin = origin;
  if (referer) requestHeaders.Referer = referer;

  let res;
  try {
    res = await axios.get(targetUrl, {
      responseType: "arraybuffer",
      maxRedirects: 10,
      validateStatus: () => true,
      headers: requestHeaders,
    });
  } catch (err) {
    console.error("[stream proxy] axios error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed" },
      { status: 502 }
    );
  }

  if (res.status < 200 || res.status >= 300) {
    return NextResponse.json(
      { error: `Upstream returned ${res.status}` },
      { status: res.status === 404 ? 404 : 502 }
    );
  }

  const contentType = res.headers["content-type"] ?? "";
  const isManifest =
    contentType.includes(HLS_M3U8) ||
    contentType.includes(HLS_M3U8_ALT) ||
    targetUrl.toLowerCase().endsWith(".m3u8");

  if (isManifest) {
    const body =
      typeof Buffer !== "undefined"
        ? (res.data as Buffer).toString("utf8")
        : new TextDecoder().decode(res.data as ArrayBuffer);

    const base = new URL(targetUrl);
    const basePath = base.pathname.replace(/\/[^/]*$/, "/");
    const baseOrigin = base.origin + basePath;

    const requestUrl = new URL(request.url);
    const proxyBase = `${requestUrl.origin}/api/stream?url=`;

    /** Rewrite a single URI (relative or absolute) to proxy URL. */
    const rewriteUri = (uri: string): string => {
      try {
        const absolute = new URL(uri, baseOrigin).toString();
        return proxyBase + encodeURIComponent(absolute);
      } catch {
        return uri;
      }
    };

    /** Rewrite URI="..." or URI='...' attributes inside HLS tag lines (e.g. EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA). */
    const rewriteTagUriAttributes = (line: string): string => {
      return line.replace(
        /URI=(?:"([^"]*)"|'([^']*)')/gi,
        (match, doubleQuoted, singleQuoted) => {
          const uri = doubleQuoted ?? singleQuoted ?? "";
          return `URI="${rewriteUri(uri)}"`;
        }
      );
    };

    let lineUriRewrites = 0;
    let tagUriRewrites = 0;

    const rewritten = body
      .split("\n")
      .map((line) => {
        const trimmed = line.trimEnd();
        if (!trimmed) return line;
        if (trimmed.startsWith("#")) {
          const before = trimmed;
          const after = rewriteTagUriAttributes(trimmed);
          if (after !== before) tagUriRewrites++;
          return after;
        }
        try {
          const absolute = new URL(trimmed, baseOrigin).toString();
          lineUriRewrites++;
          return proxyBase + encodeURIComponent(absolute);
        } catch {
          return line;
        }
      })
      .join("\n");

    if (process.env.NODE_ENV === "development" && (lineUriRewrites > 0 || tagUriRewrites > 0)) {
      console.debug("[stream proxy] manifest rewrite:", { lineUriRewrites, tagUriRewrites });
    }

    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": contentType.includes("mpegurl") ? contentType : HLS_M3U8,
        "Cache-Control": "public, max-age=1, must-revalidate",
      },
    });
  }

  // Segment or other binary response: stream through
  const data = res.data as ArrayBuffer;
  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": res.headers["content-type"] ?? MP2T,
      "Cache-Control": "public, max-age=1, must-revalidate",
    },
  });
}
