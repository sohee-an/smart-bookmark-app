import { ReactNode } from "react";

type OverlayProps = {
  isOpen: boolean;
  close: () => void;
  unmount: () => void;
};

type OverlayComponent = (props: OverlayProps) => ReactNode;

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
