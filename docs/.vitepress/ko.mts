import { DefaultTheme, defineConfig } from "vitepress";

const sidebarList: DefaultTheme.SidebarItem[] = [
  { text: "소개", items: [{ text: "개요", link: "/ko/intro.html" }] },
  {
    text: "가이드",
    items: [
      { text: "개요", link: "/ko/guide.html" },
      { text: "코어 영역", link: "/ko/core.html" },
      { text: "React 영역", link: "/ko/react.html" },
      {
        text: "더 알아보기",
        items: [
          { text: "Window Focus Refetching", link: "/ko/window-focus-refetching.html" },
          { text: "Devtools", link: "/ko/devtools.html" }
        ]
      }
    ]
  }
];

const koConfig = defineConfig({
  lang: "ko-KR",
  themeConfig: {
    sidebar: sidebarList
  }
});

export default koConfig;
