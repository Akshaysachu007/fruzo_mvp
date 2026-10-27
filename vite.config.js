import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            manifest: {
                name: "Fruzo - We Blend Happiness",
                short_name: "Fruzo",
                start_url: "/",
                display: "standalone",
                background_color: "#FFFFFF",
                theme_color: "#FFDC16",
                icons: [
                    {
                        src: "/icons/fruzo-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/icons/fruzo-512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
        }),
    ],
});