import { NextRequest, NextResponse } from "next/server";

import { privateEnvironment } from "#environment/private-environment.schema.ts";

const BACKEND_URL = privateEnvironment.BACKEND_URL;
const GRAPHQL_API_KEY = privateEnvironment.GRAPHQL_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: GRAPHQL_API_KEY ? `Bearer ${GRAPHQL_API_KEY}` : "",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();

  try {
    const response = await fetch(
      `${BACKEND_URL}/graphql${searchParams ? `?${searchParams}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: GRAPHQL_API_KEY ? `Bearer ${GRAPHQL_API_KEY}` : "",
        },
      },
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
