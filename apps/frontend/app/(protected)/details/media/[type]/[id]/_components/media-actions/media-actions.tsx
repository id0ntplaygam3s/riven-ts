"use client";

import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import {
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Trash2,
  Download,
  ShieldBan,
  Loader2,
  FileJson,
  Hash,
} from "lucide-react";
import { Button } from "#components/ui/button";
import * as Dialog from "#components/ui/dialog";
import { getClient } from "#lib/graphql/client.ts";
import {
  REQUEST_ITEM,
  RESET_MEDIA_ITEM,
  RETRY_MEDIA_ITEM,
  REMOVE_MEDIA_ITEM,
  MANUAL_SCRAPE,
  PAUSE_MEDIA_ITEM,
  RESUME_MEDIA_ITEM,
  BLACKLIST_ACTIVE_STREAM,
} from "../_queries/media-actions.query";
import type { MediaItemState } from "@repo/util-plugin-sdk/dto/enums/media-item-state.enum";

interface MediaActionsProps {
  itemId: number;
  title: string;
  mediaType: "movie" | "show";
  tmdbId?: string;
  imdbId?: string;
  tvdbId?: string;
  state?: MediaItemState;
  seasons?: Array<{ number: number; id?: number }>;
  indexerData: ComponentProps<typeof import("./item-overview").ItemOverview>["data"];
}

export function MediaActions({
  itemId,
  title,
  mediaType,
  tmdbId,
  imdbId,
  tvdbId,
  state,
  seasons,
  indexerData,
}: MediaActionsProps) {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [scrapeHash, setScrapeHash] = useState("");
  const [showScrapeDialog, setShowScrapeDialog] = useState(false);

  const isCompleted = state === "Completed";
  const isPaused = state === "Paused";

  const runMutation = async (
    mutation: string,
    variables: Record<string, unknown>,
    actionName: string,
    successMessage: string,
  ) => {
    setActionInProgress(actionName);
    try {
      await getClient().mutate({
        mutation,
        variables,
        refetchQueries: ["GetMediaItem"],
      });
      toast.success(successMessage);
    } catch (e) {
      const message = e instanceof Error ? e.message : "An unknown error occurred";
      toast.error(`Error: ${message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRequest = () => {
    runMutation(
      REQUEST_ITEM,
      {
        input: {
          requestedBy: "frontend-user",
          tmdbId,
          imdbId,
          tvdbId,
          type: mediaType === "show" ? "show" : "movie",
          requestedSeasons: seasons?.map((s) => s.number),
        },
      },
      "request",
      `Request sent for "${title}"`,
    );
  };

  const handleReset = () => {
    runMutation(
      RESET_MEDIA_ITEM,
      { mediaItemId: itemId.toString() },
      "reset",
      `Reset "${title}"`,
    );
  };

  const handleRetry = () => {
    runMutation(
      RETRY_MEDIA_ITEM,
      { mediaItemId: itemId.toString() },
      "retry",
      `Retrying "${title}"`,
    );
  };

  const handleRemove = () => {
    runMutation(
      REMOVE_MEDIA_ITEM,
      { mediaItemId: itemId.toString() },
      "remove",
      `Removed "${title}"`,
    );
  };

  const handleManualScrape = () => {
    if (!scrapeHash.trim()) {
      toast.error("Please enter a torrent hash");
      return;
    }
    const hashPattern = /^[a-fA-F0-9]{40}$/;
    if (!hashPattern.test(scrapeHash.trim())) {
      toast.error("Invalid torrent hash. Must be 40 hexadecimal characters.");
      return;
    }
    runMutation(
      MANUAL_SCRAPE,
      { mediaItemId: itemId.toString(), infoHash: scrapeHash.trim().toLowerCase() },
      "manual-scrape",
      `Added stream to "${title}"`,
    );
    setScrapeHash("");
    setShowScrapeDialog(false);
  };

  const handlePause = () => {
    runMutation(
      PAUSE_MEDIA_ITEM,
      { mediaItemId: itemId.toString() },
      "pause",
      `Paused "${title}"`,
    );
  };

  const handleResume = () => {
    runMutation(
      RESUME_MEDIA_ITEM,
      { mediaItemId: itemId.toString() },
      "resume",
      `Resumed "${title}"`,
    );
  };

  const handleBlacklist = () => {
    runMutation(
      BLACKLIST_ACTIVE_STREAM,
      { mediaItemId: itemId.toString() },
      "blacklist",
      `Active stream blacklisted for "${title}"`,
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Request - only when no riven item */}
      {!state && tmdbId && (
        <Button
          variant="secondary"
          size="sm"
          disabled={actionInProgress === "request"}
          onClick={handleRequest}
          className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary bg-transparent px-4"
        >
          {actionInProgress === "request" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          Request
        </Button>
      )}

      {/* Actions when we have a riven item */}
      {state && (
        <>
          {/* Reset */}
          <Button
            variant="secondary"
            size="sm"
            disabled={actionInProgress === "reset"}
            onClick={handleReset}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-transparent px-4"
          >
            {actionInProgress === "reset" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1.5 h-4 w-4" />
            )}
            Reset
          </Button>

          {/* Retry */}
          <Button
            variant="secondary"
            size="sm"
            disabled={actionInProgress === "retry"}
            onClick={handleRetry}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-transparent px-4"
          >
            {actionInProgress === "retry" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Retry
          </Button>

          {/* Manual Scrape */}
          <Dialog.Root open={showScrapeDialog} onOpenChange={setShowScrapeDialog}>
            <Dialog.Trigger asChild>
              <Button
                variant="secondary"
                size="sm"
                disabled={actionInProgress !== null}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-transparent px-4"
              >
                <Hash className="mr-1.5 h-4 w-4" />
                Manual Scrape
              </Button>
            </Dialog.Trigger>
            <Dialog.Content className="w-full max-w-md">
              <Dialog.Header>
                <Dialog.Title>Manual Scrape</Dialog.Title>
                <Dialog.Description>
                  Enter a torrent hash (40 hex characters) to add a stream manually.
                </Dialog.Description>
              </Dialog.Header>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Torrent Hash
                  </label>
                  <input
                    type="text"
                    value={scrapeHash}
                    onChange={(e) => setScrapeHash(e.target.value)}
                    placeholder="e.g. a1b2c3d4e5f6..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    disabled={actionInProgress !== null}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleManualScrape();
                    }}
                  />
                  <p className="text-xs text-zinc-500">
                    Paste the 40-character SHA-1 hash from your torrent file or magnet link.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowScrapeDialog(false)}
                    disabled={actionInProgress !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleManualScrape}
                    disabled={actionInProgress !== null || !scrapeHash.trim()}
                  >
                    {actionInProgress === "manual-scrape" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 h-4 w-4" />
                    )}
                    Add Stream
                  </Button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Root>

          {/* Pause/Resume */}
          {!isCompleted && (
            <Button
              variant="secondary"
              size="sm"
              disabled={actionInProgress === "pause" || actionInProgress === "resume"}
              onClick={isPaused ? handleResume : handlePause}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-transparent px-4"
            >
              {actionInProgress === "pause" || actionInProgress === "resume" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : isPaused ? (
                <Play className="mr-1.5 h-4 w-4" />
              ) : (
                <Pause className="mr-1.5 h-4 w-4" />
              )}
              {isPaused ? "Resume" : "Pause"}
            </Button>
          )}

          {/* Remove */}
          <Button
            variant="destructive"
            size="sm"
            disabled={actionInProgress === "remove"}
            onClick={handleRemove}
            className="px-4"
          >
            {actionInProgress === "remove" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            Remove
          </Button>

          {/* Blacklist Active Stream */}
          <Button
            variant="secondary"
            size="sm"
            disabled={actionInProgress === "blacklist"}
            onClick={handleBlacklist}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-transparent px-4"
          >
            {actionInProgress === "blacklist" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ShieldBan className="mr-1.5 h-4 w-4" />
            )}
            Blacklist Stream
          </Button>

          {/* Request More (for shows) */}
          {mediaType === "show" && tmdbId && (
            <Button
              variant="secondary"
              size="sm"
              disabled={actionInProgress === "request"}
              onClick={handleRequest}
              className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary bg-transparent px-4"
            >
              {actionInProgress === "request" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Request More
            </Button>
          )}
        </>
      )}

      {/* Raw Data Dialog */}
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-transparent px-4"
          >
            <FileJson className="mr-1.5 h-4 w-4" />
            Raw Data
          </Button>
        </Dialog.Trigger>
        <Dialog.Content className="w-full max-w-4xl">
          <Dialog.Header>
            <Dialog.Title>Raw Riven Data</Dialog.Title>
          </Dialog.Header>
          <div className="bg-muted/50 max-h-[500px] overflow-auto rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-xs font-mono text-green-400">
              {JSON.stringify(
                {
                  id: itemId,
                  type: mediaType,
                  tmdbId,
                  imdbId,
                  tvdbId,
                  state,
                  seasons,
                  title,
                },
                null,
                2,
              )}
            </pre>
          </div>
          <Dialog.Close asChild>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(
                    {
                      id: itemId,
                      type: mediaType,
                      tmdbId,
                      imdbId,
                      tvdbId,
                      state,
                      seasons,
                      title,
                    },
                    null,
                    2,
                  ),
                );
                toast.success("Copied!");
              }}
            >
              Copy JSON
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}