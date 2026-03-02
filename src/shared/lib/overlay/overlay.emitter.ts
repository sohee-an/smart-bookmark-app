import type { OverlayComponent } from "./overlay.types";

// 이벤트별 payload 타입 정의
type OverlayEventMap = {
  OPEN: { id: string; component: OverlayComponent };
  CLOSE: { id: string };
  UNMOUNT: { id: string };
};

type OverlayEventKey = keyof OverlayEventMap;

type EmitterListener<T> = (payload: T) => void;

class OverlayEventEmitter {
  private listeners = new Map<OverlayEventKey, EmitterListener<any>>();

  on<K extends OverlayEventKey>(event: K, callback: EmitterListener<OverlayEventMap[K]>) {
    this.listeners.set(event, callback);
  }

  emit<K extends OverlayEventKey>(event: K, payload: OverlayEventMap[K]) {
    this.listeners.get(event)?.(payload);
  }

  off(event: OverlayEventKey) {
    this.listeners.delete(event);
  }
}

export const overlayEmitter = new OverlayEventEmitter();
