import { useReducer, useEffect } from "react";
import { overlayEmitter } from "./overlay.emitter";
import { overlayReducer, initialState } from "./overlay.reducer";
import { overlay } from "./overlay";
import type { OverlayAction } from "./overlay.types";

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(overlayReducer, initialState);

  useEffect(() => {
    // OverlayProvider가 마운트되면
    // emitter 신호 구독 시작
    overlayEmitter.on("OPEN", (payload: OverlayAction & { type: "OPEN" }) => {
      dispatch({ type: "OPEN", id: payload.id, component: payload.component });
    });

    overlayEmitter.on("CLOSE", (payload: { id: string }) => {
      dispatch({ type: "CLOSE", id: payload.id });
    });

    overlayEmitter.on("UNMOUNT", (payload: { id: string }) => {
      dispatch({ type: "UNMOUNT", id: payload.id });
    });

    // OverlayProvider가 언마운트되면
    // 구독 해제
    return () => {
      overlayEmitter.off("OPEN");
      overlayEmitter.off("CLOSE");
      overlayEmitter.off("UNMOUNT");
    };
  }, []);

  return (
    <>
      {children}

      {/* overlay 목록 렌더링 */}
      {state.overlays.map((item) =>
        item.component({
          isOpen: item.isOpen,
          close: () => overlay.close(item.id),
          unmount: () => overlay.unmount(item.id),
        })
      )}
    </>
  );
}
