// Fallback icon names for the packs bundled inside the jekyll-icon-flow
// gem. Used when no workspace or vendored copy is available. Re-sync this
// list when the gem adds or removes icons — it mirrors assets/icons/<pack>/.
export const BUNDLED_PACK_ICONS: Record<string, string[]> = {
  lucide: [
    "arrow-down", "arrow-left", "arrow-right", "arrow-up", "calendar",
    "check", "chevron-down", "chevron-left", "chevron-right", "chevron-up",
    "copy", "download", "external-link", "file-text", "folder", "home",
    "info", "link", "mail", "map-pin", "map", "menu", "moon", "printer",
    "rss", "search", "sun", "tag", "triangle-alert", "x",
  ],
  simple: [
    "bluesky", "discord", "facebook", "github", "instagram", "mastodon",
    "medium", "rss", "spotify", "telegram", "tiktok", "x", "youtube",
  ],
};
