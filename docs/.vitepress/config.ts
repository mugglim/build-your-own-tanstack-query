import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Build your own TanStack Query",
  description: "Build your own TanStack Query",
  locales: {
    root: { label: "한국어" }
  },
  themeConfig: {
    siteTitle: "Build Your Own TanStack Query",
    outline: "deep",
    nav: [
      { text: "소개", link: "/intro" },
      { text: "주요 기능", link: "/core" },
      { text: "추가 기능", link: "/refetch-on-window-focus" }
    ],
    sidebar: [
      {
        text: "가이드",
        items: [{ text: "소개", link: "/intro" }]
      },
      {
        text: "설명",
        items: [
          { text: "구조", link: "/architecture" },
          {
            text: "주요 기능",
            items: [
              { text: "코어 영역", link: "/core" },
              { text: "React에 적용하기", link: "/core-with-react" }
            ]
          },
          {
            text: "추가 기능",
            items: [
              { text: "refetchOnWindowFocus", link: "/refetch-on-window-focus" },
              { text: "개발 도구", link: "/dev-tool" }
            ]
          }
        ]
      }
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/mugglim/build-your-own-tanstack-query" }]
  }
});
