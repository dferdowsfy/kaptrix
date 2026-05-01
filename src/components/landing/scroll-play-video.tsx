"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom-chrome YouTube player.
 *
 * The previous version cropped the iframe to hide YouTube branding,
 * which made the video soft because the visible frame was upscaled.
 * This version keeps the iframe at native size and uses the YouTube
 * IFrame Player API to drive a fully custom control surface that sits
 * on top — play/pause, scrub bar, ±10s skip, and a mute toggle in the
 * top-right corner.
 *
 * Branding suppression now relies on:
 *  - `controls=0` so YouTube's native chrome never paints.
 *  - A click shield over the iframe so user interaction can't summon
 *    the "Watch on YouTube" / share / channel-info overlays.
 *  - The custom bottom bar sits exactly where YouTube would show its
 *    wordmark, so the badge is visually obscured without cropping.
 *
 * Quality is pinned to 1080p via `setPlaybackQuality` once the player
 * reports onReady (YouTube's auto-quality picker tends to start low
 * during embed bootstrap).
 */

const VIDEO_ID = "I_vf3lP0giw";

// Minimal subset of the YT IFrame Player API we actually use. The full
// types live behind `@types/youtube` but pulling that in just for this
// landing widget isn't worth the dependency.
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackQuality(quality: string): void;
  getPlayerState(): number;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

interface YTNamespace {
  Player: new (
    id: string,
    config: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: YTPlayerEvent) => void;
        onStateChange?: (e: YTPlayerEvent) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: {
    PLAYING: 1;
    PAUSED: 2;
    ENDED: 0;
    BUFFERING: 3;
    CUED: 5;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Singleton-style API loader. The IFrame API script can only be
// inserted once per page; subsequent components just await `window.YT`.
let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ScrollPlayVideo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showChrome, setShowChrome] = useState(false);

  // ── Player bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;
    if (!mount) return;

    // Each instance gets its own target div so multiple players can
    // coexist on the page without stomping on each other.
    const targetId = `yt-${Math.random().toString(36).slice(2)}`;
    const target = document.createElement("div");
    target.id = targetId;
    target.style.width = "100%";
    target.style.height = "100%";
    mount.appendChild(target);

    void loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      const player = new YT.Player(targetId, {
        videoId: VIDEO_ID,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: VIDEO_ID, // required for loop=1 on a single video
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: 1,
          playsinline: 1,
          fs: 0,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            playerRef.current = event.target;
            try {
              event.target.setPlaybackQuality("hd1080");
            } catch {
              // setPlaybackQuality is a hint; older API versions ignore it.
            }
            setDuration(event.target.getDuration());
            setMuted(event.target.isMuted());
            setReady(true);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            setPlaying(event.data === 1);
            // `getDuration` returns 0 until metadata loads — refresh once
            // the player transitions out of the cued state.
            const d = event.target.getDuration();
            if (d > 0) setDuration(d);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current = null;
    };
  }, []);

  // ── Time polling for progress bar ─────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const t = p.getCurrentTime();
      if (Number.isFinite(t)) setCurrentTime(t);
    }, 250);
    return () => window.clearInterval(id);
  }, [ready]);

  // ── Auto play/pause on scroll ─────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const player = playerRef.current;
          if (!player) continue;
          if (entry.isIntersecting) player.playVideo();
          else player.pauseVideo();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Chrome auto-hide ──────────────────────────────────────────────
  const revealChrome = useCallback(() => {
    setShowChrome(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowChrome(false), 2500);
  }, []);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  // ── Controls ──────────────────────────────────────────────────────
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
    revealChrome();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
    revealChrome();
  };

  const skip = (delta: number) => {
    const p = playerRef.current;
    if (!p) return;
    const next = Math.max(0, Math.min(duration || 0, p.getCurrentTime() + delta));
    p.seekTo(next, true);
    setCurrentTime(next);
    revealChrome();
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const next = pct * duration;
    p.seekTo(next, true);
    setCurrentTime(next);
    revealChrome();
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={revealChrome}
      onMouseLeave={() => setShowChrome(false)}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]"
    >
      {/* YT player mount. The IFrame API replaces this div with an
          iframe of the same id at native resolution. */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Click shield: catches all interactions targeting the iframe so
          YouTube's own overlays (channel info, "Watch on YouTube",
          share button) never get triggered. Sits below the custom
          controls so our buttons remain interactive. */}
      <div aria-hidden className="absolute inset-0 z-10" />

      {/* Top-right volume toggle. Always reachable via mouseMove on
          the container; fades with the rest of the chrome. */}
      <div
        className={`absolute right-3 top-3 z-30 transition-opacity duration-300 ${
          showChrome ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
        >
          {muted ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-5 w-5"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-5 w-5"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>

      {/* Bottom control bar: play/pause, skip ±10s, scrub, timestamps.
          Sitting flush with the bottom of the frame naturally obscures
          the YouTube wordmark area. */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300 sm:px-5 ${
          showChrome ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Scrub bar */}
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.floor(duration))}
          aria-valuenow={Math.floor(currentTime)}
          tabIndex={0}
          onClick={handleScrub}
          className="group/scrub mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full bg-indigo-300 transition-[width] duration-150 group-hover/scrub:bg-white"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-2 text-white sm:gap-3">
          <button
            type="button"
            onClick={() => skip(-10)}
            aria-label="Back 10 seconds"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-4 w-4"
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            {playing ? (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
                className="h-4 w-4"
              >
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
                className="h-4 w-4"
              >
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => skip(10)}
            aria-label="Forward 10 seconds"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-4 w-4"
            >
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
          <span className="ml-2 text-xs tabular-nums text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
