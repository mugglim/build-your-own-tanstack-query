import { DefaultTheme, defineConfig } from "vitepress";

const sidebarList: DefaultTheme.SidebarItem[] = [
  { text: "Introduction", items: [{ text: "Overview", link: "/intro.html" }] },
  {
    text: "Guide",
    items: [
      { text: "Overview", link: "/guide.html" },
      { text: "Core", link: "/core.html" },
      { text: "React", link: "/react.html" },
      {
        text: "Learn More",
        items: [
          { text: "Window Focus Refetching", link: "/window-focus-refetching.html" },
          { text: "Devtools", link: "/devtools.html" }
        ]
      }
    ]
  }
];

const enConfig = defineConfig({
  lang: "en-US",
  themeConfig: {
    sidebar: sidebarList
  }
});

export default enConfig;
