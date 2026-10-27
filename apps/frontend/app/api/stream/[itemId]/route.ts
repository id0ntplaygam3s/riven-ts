import { privateEnvironment } from "#environment/private-environment.schema.ts";

/**
 * Proxy stream file requests to the backend.
 * Supports range requests for seeking.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const backendUrl = privateEnvironment.BACKEND_URL;

  if (!itemId || isNaN(Number(itemId))) {
    return new Response("Invalid item ID", { status: 400 });
  }

  const streamUrl = `${backendUrl}/api/v1/stream/file/${itemId}${request.url.split("?")[1] ? `?${request.url.split("?")[1]}` : ""}`;

  const headers: Record<string, string> = {
    "x-api-key": privateEnvironment.GRAPHQL_API_KEY ?? "",
  };

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  try {
    const response = await fetch(streamUrl, {
      headers,
      method: "GET",
    });

    if (!response.ok) {
      return new Response(`Failed to fetch stream: ${response.statusText}`, {
        status: response.status,
      });
    }

    const responseHeaders = new Headers();

    const headersToForward = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "content-disposition",
    ];

    headersToForward.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error("Stream proxy error:", e);
    return new Response("Failed to proxy stream", { status: 502 });
  }
}
