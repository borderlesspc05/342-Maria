import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/** Renderiza modal no body para centralização correta na viewport. */
export function renderModalPortal(content: ReactNode): ReactNode {
  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
}
