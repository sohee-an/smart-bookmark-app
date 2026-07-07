import type { OverlayComponent } from "./overlay.types";

type OverlayEventMap = {
  OPEN: { id: string; component: OverlayComponent };
  CLOSE: { id: string };
  UNMOUNT: { id: string };
};

type OverlayEventKey = keyof OverlayEventMap;

type EmitterListener<T> = (payload: T) => void;

class OverlayEventEmitter {
  private listeners = new Map<OverlayEventKey, EmitterListener<unknown>>();

  on<K extends OverlayEventKey>(event: K, callback: EmitterListener<OverlayEventMap[K]>) {
    this.listeners.set(event, callback as EmitterListener<unknown>);
  }

  emit<K extends OverlayEventKey>(event: K, payload: OverlayEventMap[K]) {
    this.listeners.get(event)?.(payload);
  }

  off(event: OverlayEventKey) {
    this.listeners.delete(event);
  }
}

export const overlayEmitter = new OverlayEventEmitter();
