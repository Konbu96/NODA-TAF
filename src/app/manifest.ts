import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "野田陸上部",
    short_name: "野田陸上部",
    start_url: "/",
    display: "standalone",
    background_color: "#F1F5F9",
    theme_color: "#1E3A8A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
