export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type ConfirmPayload = ConfirmOptions & {
  resolve: (result: boolean) => void;
};

export function requestConfirm(options: ConfirmOptions): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    const payload: ConfirmPayload = { ...options, resolve };
    window.dispatchEvent(new CustomEvent("app-confirm", { detail: payload }));
  });
}
