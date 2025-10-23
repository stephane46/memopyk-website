// 🔧 TEST WRITE ACCESS: this comment proves I can edit the file!

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async () => {
  const plugins: any[] = [react()];

  // Add runtime error overlay plugin dynamically
  try {
    const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal");
    const plugin = runtimeErrorOverlay.default();
    if (plugin) plugins.push(plugin);
  } catch (err: any) {
    console.warn("Could not load @replit/vite-plugin-runtime-error-modal:", err?.message);
  }

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const cartographer = await import("@replit/vite-plugin-cartographer");
      const cartographerPlugin = cartographer.cartographer();
      if (cartographerPlugin) plugins.push(cartographerPlugin);
    } catch (err: any) {
      console.warn("Could not load @replit/vite-plugin-cartographer:", err?.message);
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client", "src"),
        "@shared": path.resolve(process.cwd(), "shared"),
        "@assets": path.resolve(process.cwd(), "attached_assets"),
      },
    },
    root: path.resolve(process.cwd(), "client"),
    build: {
      outDir: path.resolve(process.cwd(), "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});