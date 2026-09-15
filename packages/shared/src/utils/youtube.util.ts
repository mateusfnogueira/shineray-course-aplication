const ALLOWED_YOUTUBE_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a YouTube videoId from various URL formats or a plain videoId.
 * Accepts:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://www.youtube-nocookie.com/embed/VIDEO_ID
 *   - VIDEO_ID (11-character alphanumeric string)
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!ALLOWED_YOUTUBE_HOSTNAMES.has(url.hostname)) {
    return null;
  }

  // https://www.youtube.com/watch?v=VIDEO_ID
  if (
    (url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com') &&
    url.pathname === '/watch'
  ) {
    const videoId = url.searchParams.get('v');
    return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  }

  // https://youtu.be/VIDEO_ID
  if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
    const videoId = url.pathname.slice(1).split('?')[0];
    return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  }

  // https://www.youtube.com/embed/VIDEO_ID or https://www.youtube-nocookie.com/embed/VIDEO_ID
  if (url.pathname.startsWith('/embed/')) {
    const videoId = url.pathname.split('/embed/')[1]?.split('?')[0];
    return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  }

  return null;
}

export function isValidYouTubeVideoId(videoId: string): boolean {
  return VIDEO_ID_PATTERN.test(videoId);
}

/**
 * Builds a privacy-enhanced YouTube embed URL.
 * Always uses youtube-nocookie.com to reduce tracking.
 */
export function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
