"use client";

import { Fragment, useReducer, useEffect } from "react";
import { overlayEmitter } from "./overlay.emitter";
import { overlayReducer, initialState } from "./overlay.reducer";
import { overlay } from "./overlay";

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(overlayReducer, initialState);

  useEffect(() => {
    overlayEmitter.on("OPEN", (payload) => {
      dispatch({ type: "OPEN", id: payload.id, component: payload.component });
    });

    overlayEmitter.on("CLOSE", (payload: { id: string }) => {
      dispatch({ type: "CLOSE", id: payload.id });
    });

    overlayEmitter.on("UNMOUNT", (payload: { id: string }) => {
      dispatch({ type: "UNMOUNT", id: payload.id });
    });

    return () => {
      overlayEmitter.off("OPEN");
      overlayEmitter.off("CLOSE");
      overlayEmitter.off("UNMOUNT");
    };
  }, []);

  return (
    <>
      {children}

      {state.overlays.map((item) => (
        <Fragment key={item.id}>
          {item.component({
            isOpen: item.isOpen,
            close: () => overlay.close(item.id),
            unmount: () => overlay.unmount(item.id),
          })}
        </Fragment>
      ))}
    </>
  );
}
