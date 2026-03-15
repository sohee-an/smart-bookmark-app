import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: false }, // Pages Router
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
