import type { OverlayState, OverlayAction } from "./overlay.types";

export const initialState: OverlayState = {
  overlays: [],
};

export function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
  switch (action.type) {
    case "OPEN":
      return {
        ...state,
        overlays: [...state.overlays, { id: action.id, isOpen: true, component: action.component }],
      };

    case "CLOSE":
      return {
        ...state,
        overlays: state.overlays.map((item) => {
          if (item.id == action.id) {
            return {
              ...item,
              isOpen: false,
            };
          }
          return item;
        }),
      };

    case "UNMOUNT":
      return {
        ...state,
        overlays: state.overlays.filter((item) => item.id !== action.id),
      };
  }
}
