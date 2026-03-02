import { ReactNode } from "react";

// props 타입 먼저
type OverlayProps = {
  isOpen: boolean;
  close: () => void;
  unmount: () => void;
};

// component 타입 명시적으로
type OverlayComponent = (props: OverlayProps) => ReactNode;

// 적용
type OverlayItem = {
  id: string;
  isOpen: boolean;
  component: OverlayComponent;
};

type OverlayState = {
  overlays: OverlayItem[];
};

type OverlayAction =
  | { type: "OPEN"; id: string; component: OverlayComponent }
  | { type: "CLOSE"; id: string }
  | { type: "UNMOUNT"; id: string };

export type { OverlayProps, OverlayComponent, OverlayItem, OverlayState, OverlayAction };
