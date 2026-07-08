import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true }, // App Router (프로젝트 실제 라우터에 정렬)
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#fafafa" },
        { name: "dark", value: "#09090b" },
      ],
    },
  },
};

export default preview;
