import { privateEnvironment } from "#environment/private-environment.schema.ts";

/**
 * Proxy HLS stream requests to the backend.
 * Handles both playlist (.m3u8) and segment (.ts) requests.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string; file: string }> },
) {
  const { itemId, file } = await params;
  const backendUrl = privateEnvironment.BACKEND_URL;

  if (!itemId || !file) {
    return new Response("Invalid parameters", { status: 400 });
  }

  // Map frontend path to backend path
  // Incoming: /api/stream/123/hls/index.m3u8
  // Target:   {backend}/api/v1/stream/hls/123/index.m3u8
  // Incoming: /api/stream/123/hls/segment/0.ts
  // Target:   {backend}/api/v1/stream/hls/123/segment/0.ts
  const backendPath = `/api/v1/stream/hls/${itemId}/${file}`;
  const streamUrl = `${backendUrl}${backendPath}${request.url.split("?")[1] ? `?${request.url.split("?")[1]}` : ""}`;

  const headers: Record<string, string> = {
    "x-api-key": privateEnvironment.GRAPHQL_API_KEY ?? "",
  };

  try {
    const response = await fetch(streamUrl, {
      headers,
      method: "GET",
    });

    if (!response.ok) {
      console.error(`Backend HLS error: ${response.status} for ${file}`);
      return new Response("Failed to fetch HLS stream", { status: response.status });
    }

    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);

    // Cache segments aggressively (VOD content)
    if (file.endsWith(".ts")) {
      responseHeaders.set("cache-control", "public, max-age=3600");
    }

    return new Response(response.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error("HLS proxy error:", e);
    return new Response("Failed to proxy HLS", { status: 502 });
  }
}
