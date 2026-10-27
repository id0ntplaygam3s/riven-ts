export const REQUEST_ITEM = `
  mutation RequestItem($input: RequestItemInput!) {
    requestItem(input: $input)
  }
`;

export const RESET_MEDIA_ITEM = `
  mutation ResetMediaItem($mediaItemId: ID!) {
    resetMediaItem(mediaItemId: $mediaItemId)
  }
`;

export const RETRY_MEDIA_ITEM = `
  mutation RetryMediaItem($mediaItemId: ID!) {
    retryMediaItem(mediaItemId: $mediaItemId)
  }
`;

export const REMOVE_MEDIA_ITEM = `
  mutation RemoveMediaItem($mediaItemId: ID!) {
    removeMediaItem(mediaItemId: $mediaItemId)
  }
`;

export const MANUAL_SCRAPE = `
  mutation ManualScrape($mediaItemId: ID!, $infoHash: String!) {
    manualScrape(mediaItemId: $mediaItemId, infoHash: $infoHash)
  }
`;

export const PAUSE_MEDIA_ITEM = `
  mutation PauseMediaItem($mediaItemId: ID!) {
    pauseMediaItem(mediaItemId: $mediaItemId)
  }
`;

export const RESUME_MEDIA_ITEM = `
  mutation ResumeMediaItem($mediaItemId: ID!) {
    resumeMediaItem(mediaItemId: $mediaItemId)
  }
`;

export const BLACKLIST_ACTIVE_STREAM = `
  mutation BlacklistActiveStream($mediaItemId: ID!) {
    blacklistActiveStream(mediaItemId: $mediaItemId)
  }
`;

export const SHARE_LOGS = `
  mutation ShareLogs {
    shareLogs
  }
`;
