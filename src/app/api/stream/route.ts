import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HLS_M3U8 = "application/vnd.apple.mpegurl";
const HLS_M3U8_ALT = "application/x-mpegURL";
const MP2T = "video/MP2T";

/** Build request headers for upstream (Range, If-Range, optional Origin/Referer from query). */
function buildUpstreamHeaders(
  request: NextRequest,
  overrides?: { origin?: string; referer?: string }
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "*/*",
    "User-Agent": "RakunFlow/1.0",
  };
  const range = request.headers.get("range");
  const ifRange = request.headers.get("if-range");
  if (range) headers.Range = range;
  if (ifRange) headers["If-Range"] = ifRange;
  if (overrides?.origin?.trim()) headers.Origin = overrides.origin.trim();
  if (overrides?.referer?.trim()) headers.Referer = overrides.referer.trim();
  return headers;
}

/** Pass through media-critical response headers from upstream. */
function mediaResponseHeaders(upstreamHeaders: Record<string, string>, defaultContentType: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": upstreamHeaders["content-type"] ?? defaultContentType,
    "Cache-Control": upstreamHeaders["cache-control"] ?? "public, max-age=1, must-revalidate",
  };
  if (upstreamHeaders["accept-ranges"]) h["Accept-Ranges"] = upstreamHeaders["accept-ranges"];
  if (upstreamHeaders["content-range"]) h["Content-Range"] = upstreamHeaders["content-range"];
  if (upstreamHeaders["content-length"]) h["Content-Length"] = upstreamHeaders["content-length"];
  if (upstreamHeaders["etag"]) h["ETag"] = upstreamHeaders["etag"];
  if (upstreamHeaders["last-modified"]) h["Last-Modified"] = upstreamHeaders["last-modified"];
  return h;
}

/**
 * Proxies HLS (and segment) requests server-side to avoid CORS and follow redirects.
 * GET /api/stream?url=<encoded-url> — full response with optional Range/206.
 * HEAD /api/stream?url=<encoded-url> — headers only (e.g. Safari probes).
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


  const fallbackOrigin = "https://pushembdz.store"
  const fallbackReferer = `https://pushembdz.store/`

  const originParam = searchParams.get("origin") || fallbackOrigin;
  const refererParam = searchParams.get("referer") || fallbackReferer;
  let origin: string | undefined;
  let referer: string | undefined;
  try {
    origin = originParam ? decodeURIComponent(originParam) : undefined;
    referer = refererParam ? decodeURIComponent(refererParam) : undefined;
  } catch {
    origin = referer = undefined;
  }
  const requestHeaders = buildUpstreamHeaders(request, { origin, referer });

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

  const okStatuses = [200, 206, 416];
  if (!okStatuses.includes(res.status)) {
    return NextResponse.json(
      { error: `Upstream returned ${res.status}` },
      { status: res.status === 404 ? 404 : 502 }
    );
  }

  const contentType = res.headers["content-type"] ?? "";
  const body =
    res.status === 200
      ? typeof Buffer !== "undefined"
        ? (res.data as Buffer).toString("utf8")
        : new TextDecoder().decode(res.data as ArrayBuffer)
      : "";
  const looksLikeManifestByType =
    contentType.includes(HLS_M3U8) ||
    contentType.includes(HLS_M3U8_ALT) ||
    targetUrl.toLowerCase().endsWith(".m3u8");
  const isManifest =
    res.status === 200 &&
    (looksLikeManifestByType || body.trimStart().startsWith("#EXTM3U"));

  if (isManifest) {
    const contentLocation = res.headers["content-location"];
    const baseUrl =
      typeof contentLocation === "string" && contentLocation.trim()
        ? new URL(contentLocation.trim(), targetUrl).toString()
        : targetUrl;
    const base = new URL(baseUrl);
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

  // Segment or other binary response: pass through status and media-critical headers for Safari/AVPlayer
  const data = res.data as ArrayBuffer;
  return new NextResponse(data, {
    status: res.status as 200 | 206 | 416,
    headers: mediaResponseHeaders(res.headers as Record<string, string>, MP2T),
  });
}

/** HEAD: return same headers as GET for the given URL (no body). Used by Safari/native players for probes. */
export async function HEAD(request: NextRequest) {
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
  let headOrigin: string | undefined;
  let headReferer: string | undefined;
  try {
    const op = searchParams.get("origin");
    const rp = searchParams.get("referer");
    headOrigin = op ? decodeURIComponent(op) : undefined;
    headReferer = rp ? decodeURIComponent(rp) : undefined;
  } catch {
    headOrigin = headReferer = undefined;
  }
  const requestHeaders = buildUpstreamHeaders(request, { origin: headOrigin, referer: headReferer });
  let res;
  try {
    res = await axios.head(targetUrl, {
      maxRedirects: 10,
      validateStatus: () => true,
      headers: requestHeaders,
    });
  } catch (err) {
    console.error("[stream proxy] HEAD axios error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed" },
      { status: 502 }
    );
  }
  const okStatuses = [200, 206, 416];
  if (!okStatuses.includes(res.status)) {
    return NextResponse.json(
      { error: `Upstream returned ${res.status}` },
      { status: res.status === 404 ? 404 : 502 }
    );
  }
  const contentType = res.headers["content-type"] ?? "";
  const isManifest =
    res.status === 200 &&
    (contentType.includes(HLS_M3U8) ||
      contentType.includes(HLS_M3U8_ALT) ||
      targetUrl.toLowerCase().endsWith(".m3u8"));
  if (isManifest) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType.includes("mpegurl") ? contentType : HLS_M3U8,
        "Cache-Control": "public, max-age=1, must-revalidate",
      },
    });
  }
  return new NextResponse(null, {
    status: res.status as 200 | 206 | 416,
    headers: mediaResponseHeaders(res.headers as Record<string, string>, MP2T),
  });
}
