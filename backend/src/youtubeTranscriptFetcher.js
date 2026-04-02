
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36";

function extractVideoId(url) {
  const regex =
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getVideoPage(videoId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube page: ${res.status}`);
  }

  return await res.text();
}

function extractCaptionsJson(html) {
  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseTranscriptXml(xml) {
  const results = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)">(.*?)<\/text>/g;

  let match;
  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = decodeHtml(match[3]);

    if (text) {
      results.push({
        text,
        offset: start,
        duration,
      });
    }
  }

  return results;
}

export async function fetchTranscript(videoUrl, lang = "en") {
  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  const html = await getVideoPage(videoId);
  const playerResponse = extractCaptionsJson(html);

  const tracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || tracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  // Prefer requested language, fallback to first available
  const track =
    tracks.find((t) => t.languageCode === lang) || tracks[0];

  const captionRes = await fetch(track.baseUrl, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!captionRes.ok) {
    throw new Error("Failed to fetch captions track");
  }

  const xml = await captionRes.text();

  return parseTranscriptXml(xml);
}
