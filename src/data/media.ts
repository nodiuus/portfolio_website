import type { MusicTrack } from "../types";

// Track metadata and artwork were supplied from Nisan's reference playlist.
// Only the first track included a verified playback source in the supplied markup.
export const musicTracks: MusicTrack[] = [
  {
    id: "new-kind-of-love",
    title: "A New Kind Of Love",
    artist: "SEREN",
    artwork: "/media/tracks/new-kind-of-love.webp",
    accent: "#806090",
    duration: "04:04",
    playbackUrl: "https://www.youtube.com/watch?v=zDsnUcdspLw",
  },
  {
    id: "beauty-and-a-beat",
    title: "Beauty And A Beat",
    artist: "Justin Bieber",
    artwork: "/media/tracks/beauty-and-a-beat.webp",
    accent: "#7a3f2d",
  },
  {
    id: "4am",
    title: "4AM",
    artist: "Kaskade",
    artwork: "/media/tracks/4am.webp",
    accent: "#0090c0",
  },
  {
    id: "geisha",
    title: "Geisha",
    artist: "L’Impératrice",
    artwork: "/media/tracks/geisha.webp",
    accent: "#4a2b80",
  },
];
