import type { MetadataRoute } from "next";

// handle_links：Android でアプリを入れた人が、ほかのアプリのリンクから開いたときにアプリで開く
export default function manifest(): MetadataRoute.Manifest & { handle_links: string } {
  return {
    id: "/",
    name: "野田陸上部",
    short_name: "野田陸上部",
    start_url: "/",
    display: "standalone",
    handle_links: "preferred",
    launch_handler: { client_mode: "navigate-existing" },
    background_color: "#1E3A8A",
    theme_color: "#1E3A8A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
