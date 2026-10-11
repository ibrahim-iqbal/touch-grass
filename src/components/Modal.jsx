import { useEffect, useRef } from "react";

const FOCUSABLE = 'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])';

// generic overlay with the focus trap, Escape-to-close and backdrop-click-to-
// close behavior ported from the vanilla modal helpers. `drawer` picks the
// side-drawer variant (settings/help); default is the centered modal (camera).
export default function Modal({ open, onClose, drawer, label, labelledBy, children }) {
  const innerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const inner = innerRef.current;
    inner?.querySelector(FOCUSABLE)?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(inner.querySelectorAll(FOCUSABLE));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={"modal" + (drawer ? " drawer-modal" : "")}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={innerRef} className={"modal-inner" + (drawer ? " settings-inner drawer-inner" : "")}>
        {children}
      </div>
    </div>
  );
}
