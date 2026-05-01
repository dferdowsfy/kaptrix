"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll/hover-triggered YouTube embed, styled to feel native to the
 * landing page rather than a hosted player.
 *
 * Branding suppression strategy (YouTube actively pushes back on this):
 *  - `youtube-nocookie.com` privacy-enhanced domain.
 *  - `controls=0` removes the chrome (no big play button, no progress bar).
 *  - `rel=0` keeps end-screen suggestions to the same channel only.
 *  - `modestbranding=1` minimizes the YouTube wordmark.
 *  - `iv_load_policy=3` strips video annotations.
 *  - The iframe is oversized (110% height, shifted up 3%) and the
 *    container is `overflow-hidden`, so the bottom-right YouTube
 *    watermark is clipped off the visible area.
 *  - A transparent click shield sits on top of the iframe so users
 *    can't click through to youtube.com or trigger the share UI.
 *
 * Playback control uses the YT IFrame postMessage API
 * (`enablejsapi=1` is required) — IntersectionObserver plays the
 * video when the section is in view, pauses when it leaves, and
 * a hover handler also triggers play for users who scrolled fast
 * past the auto-trigger threshold.
 */

const VIDEO_ID = "I_vf3lP0giw";

const YT_PARAMS = new URLSearchParams({
  autoplay: "1",
  mute: "1",
  loop: "1",
  playlist: VIDEO_ID, // required for `loop=1` to work on a single video
  controls: "0",
  rel: "0",
  modestbranding: "1",
  showinfo: "0",
  iv_load_policy: "3",
  disablekb: "1",
  playsinline: "1",
  enablejsapi: "1",
  fs: "0", // disable fullscreen button
}).toString();

const SRC = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${YT_PARAMS}`;

function postCommand(
  iframe: HTMLIFrameElement | null,
  func: "playVideo" | "pauseVideo",
) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func, args: [] }),
    "*",
  );
}

export function ScrollPlayVideo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          postCommand(
            iframeRef.current,
            entry.isIntersecting ? "playVideo" : "pauseVideo",
          );
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleHover = () => postCommand(iframeRef.current, "playVideo");

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleHover}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]"
    >
      {/* Iframe is oversized + offset so the YT watermark in the
          bottom-right of the video frame is clipped by the rounded
          container's overflow:hidden. */}
      <iframe
        ref={iframeRef}
        src={SRC}
        title="Kaptrix platform demo"
        allow="autoplay; encrypted-media; picture-in-picture"
        loading="lazy"
        className="absolute left-0 h-[110%] w-full border-0"
        style={{ top: "-5%" }}
      />
      {/* Transparent shield: blocks clicks into youtube.com (share, watch
          on YouTube, etc.) without disabling the iframe's own autoplay. */}
      <div aria-hidden className="absolute inset-0" />
    </div>
  );
}
