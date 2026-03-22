type ToastPayload = {
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
};

type ToastListener = (payload: ToastPayload) => void;

const listeners: ToastListener[] = [];

export const toast = {
  show(payload: ToastPayload) {
    listeners.forEach((l) => l(payload));
  },
  subscribe(listener: ToastListener) {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
