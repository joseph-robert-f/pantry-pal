interface ToastProps {
  message: string;
  visible: boolean;
  variant?: "sage"; // default
}

// Inline confirmation toast (spec §7.3, §8). Sage colors, fades in. The message
// renders only while visible: a live region is announced when its text
// changes, so an always-present message would never be read out.
export default function Toast({ message, visible }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute left-4 right-4 bottom-4 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {visible ? (
        <div className="bg-sage-soft text-sage-deep rounded-2xl px-4 py-2 text-base text-center shadow-md">
          {message}
        </div>
      ) : null}
    </div>
  );
}

export type { ToastProps };
