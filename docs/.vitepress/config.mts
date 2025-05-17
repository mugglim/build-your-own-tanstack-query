import { defineConfig } from "vitepress";
import koConfig from "./ko.mts";
import enConfig from "./en.mts";

export default defineConfig({
  base: "/build-your-own-tanstack-query/",
  title: "Build your own TanStack Query",
  description: "Build your own TanStack Query",
  rewrites: {
    "en/:doc.md": ":doc.md"
  },
  head: [
    ["link", { rel: "icon", href: "/build-your-own-tanstack-query/tanstack-query-logo.png" }],
    ["meta", { property: "og:title", content: "Build your own TanStack Query" }],
    ["meta", { property: "og:description", content: "Build your own TanStack Query" }],
    ["meta", { property: "og:image", content: "/build-your-own-tanstack-query/tanstack-query-logo.png" }],
    ["meta", { name: "twitter:image", content: "/build-your-own-tanstack-query/tanstack-query-logo.png" }]
  ],
  locales: {
    root: { label: "English", ...enConfig },
    ko: { label: "한국어", ...koConfig }
  },
  themeConfig: {
    siteTitle: "Home",
    outline: { level: "deep" },
    socialLinks: [{ icon: "github", link: "https://github.com/mugglim/build-your-own-tanstack-query" }]
  }
});
