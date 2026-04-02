import { fetchTranscript } from "./youtubeTranscriptFetcher.js";
export function isYouTubeUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtu.be"
    );
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(value) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      return url.pathname.replace("/", "").trim() || null;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com"
    ) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function getTranscriptFromYouTubeUrl(value) {
  const videoId = extractYouTubeVideoId(value);

  if (!videoId) {
    throw new Error("Invalid YouTube URL.");
  }

  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = transcriptItems.map((item) => item.text.trim()).filter(Boolean).join(" ");

    if (!transcript) {
      throw new Error("Transcript was empty.");
    }

    return transcript;
  } catch (error) {
    console.error("YouTube transcript error:", error.message);
    throw new Error("Transcript unavailable for this YouTube video.");
  }
}
