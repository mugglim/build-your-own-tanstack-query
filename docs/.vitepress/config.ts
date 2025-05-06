import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/build-your-own-tanstack-query/",
  title: "Build your own TanStack Query",
  description: "Build your own TanStack Query",
  head: [["link", { rel: "icon", href: "/build-your-own-tanstack-query/tanstack-query-logo.png" }]],
  locales: {
    root: { label: "한국어" }
  },

  themeConfig: {
    siteTitle: "Home",
    search: {
      provider: "local"
    },
    outline: {
      level: "deep"
    },
    nav: [{ text: "학습하기", link: "/overview" }],
    sidebar: [
      {
        text: "소개",
        items: [{ text: "개요", link: "/overview" }]
      },
      {
        text: "가이드",
        items: [
          {
            text: "코어 영역",
            items: [
              { text: "소개", link: "/core/index.md" },
              { text: "QueryClient", link: "/core/query-client" },
              { text: "QueryCache", link: "/core/query-cache" },
              { text: "Query", link: "/core/query" },
              { text: "QueryObserver", link: "/core/query-observer" }
            ]
          },
          {
            text: "React 영역",
            items: [{ text: "소개", link: "/react/index.md" }]
          },
          {
            text: "더 알아보기",
            items: [
              { text: "Window Focus Refetching", link: "/learn-more/window-focus-refetching" },
              { text: "Devtools", link: "/learn-more/devtools" }
            ]
          }
        ]
      }
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/mugglim/build-your-own-tanstack-query" }]
  }
});
