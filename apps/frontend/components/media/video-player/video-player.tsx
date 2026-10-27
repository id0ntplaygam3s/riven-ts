"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamically import hls.js to avoid SSR issues
const Hls = dynamic(() => import("hls.js"), { ssr: false });

interface VideoPlayerProps {
  itemId: number;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
}

export function VideoPlayer({
  itemId,
  className = "",
  autoplay = false,
  controls = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const directUrl = `/api/stream/${itemId}`;
  const hlsUrl = `/api/stream/${itemId}/hls/index.m3u8?pix_fmt=yuv420p&profile=high&level=4.1`;

  // Check if browser needs HLS transcoding (HEVC support check)
  const needsHls = useCallback(() => {
    if (typeof document === "undefined") return false;
    const v = document.createElement("video");
    const canPlay =
      v.canPlayType('video/mp4; codecs="hvc1"') ||
      v.canPlayType('video/mp4; codecs="hev1"');
    return canPlay === "";
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;

    const initPlayer = () => {
      if (destroyed) return;

      if (needsHls()) {
        console.log("HEVC not supported. Switching to HLS transcoding.");
        if (Hls && Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 60,
            maxMaxBufferLength: 120,
            maxLoadingDelay: 4,
          });
          hlsRef.current = hls;

          hls.loadSource(hlsUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              console.error("HLS Fatal Error:", data);
              setError("Transcoding failed");
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error("Network error, trying to recover...");
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error("Media error, trying to recover...");
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  break;
              }
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!destroyed) {
              if (autoplay) {
                video.play().catch(() => {
                  // Autoplay blocked, that's okay
                });
              }
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS
          video.src = hlsUrl;
          if (autoplay) {
            video.play().catch(() => {});
          }
        }
      } else {
        console.log("HEVC/H.264 supported. Using Direct Play.");
        video.src = directUrl;
        if (autoplay) {
          video.play().catch(() => {});
        }
      }
    };

    initPlayer();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      destroyed = true;
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [itemId, directUrl, hlsUrl, autoplay, needsHls]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {error && (
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-red-500/20 p-8">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      {!error && (
        <video
          ref={videoRef}
          controls={controls}
          className="h-full w-full rounded-lg bg-black"
          playsInline
          onClick={togglePlay}
        />
      )}
    </div>
  );
}
