export interface F1StreamOption {
  name: string;
  url: string;
}

/** Predefined F1 stream URLs (HLS manifest). Same path as style.css but stream.m3u8. */
export const F1_STREAMS: F1StreamOption[] = [
  { name: "Sky Moto", url: "https://dash.serveplay.site/sky_moto/tracks-v1a1/style.css" },
  { name: "F1 Italy", url: "https://dash.serveplay.site/f1_ita/tracks-v1a1/style.css" },
  { name: "F1 Spain", url: "https://dash.serveplay.site/f1_esp/tracks-v1a1/style.css" },
  { name: "360p LR", url: "https://dash.serveplay.site/fone_lr/tracks-v1a1/style.css" },
];
