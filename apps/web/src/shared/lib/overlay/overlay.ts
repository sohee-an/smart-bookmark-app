import { overlayEmitter } from "./overlay.emitter";
import type { OverlayComponent } from "./overlay.types";

export const overlay = {
  open: (component: OverlayComponent) => {
    const id = crypto.randomUUID();

    overlayEmitter.emit("OPEN", { id, component });
  },

  close: (id: string) => {
    overlayEmitter.emit("CLOSE", { id });
  },

  unmount: (id: string) => {
    overlayEmitter.emit("UNMOUNT", { id });
  },
};
