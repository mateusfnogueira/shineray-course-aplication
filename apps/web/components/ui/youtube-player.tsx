interface YouTubePlayerProps {
  readonly videoId: string;
  readonly title: string;
  readonly startSeconds?: number;
  readonly onEnded?: () => void;
}

/**
 * Accessible, privacy-enhanced YouTube embed.
 * Uses youtube-nocookie.com to minimize tracking.
 * Never uses dangerouslySetInnerHTML.
 */
export function YouTubePlayer({
  videoId,
  title,
  startSeconds,
  onEnded,
}: YouTubePlayerProps): React.JSX.Element {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    enablejsapi: '0',
    ...(startSeconds ? { start: String(Math.floor(startSeconds)) } : {}),
  });

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        aria-label={`Player de vídeo: ${title}`}
        onLoad={onEnded ? undefined : undefined}
      />
    </div>
  );
}
