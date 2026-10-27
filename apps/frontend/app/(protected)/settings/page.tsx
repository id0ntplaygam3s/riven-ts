import { getClient } from "#lib/graphql/client.ts";

import { GET_SOURCE_CONFIGS } from "./_queries/source-config.query";

import { SettingsPage as SettingsPageClient } from "./page.client";

export default async function SettingsPage() {
  let sources = [];
  try {
    const { data } = await getClient().query({
      query: GET_SOURCE_CONFIGS,
    });
    sources = data?.sourceConfigs ?? [];
  } catch {
    // If backend isn't running yet, show empty sources
  }

  return <SettingsPageClient sources={sources} />;
}