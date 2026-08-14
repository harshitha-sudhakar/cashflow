import { useEffect, useRef } from "react";

/**
 * Fixed decorative background: a few soft, blurred green glows that drift
 * slowly on their own (CSS keyframes) and shift position as the page
 * scrolls (via a scroll listener updating a CSS custom property, read by
 * transform: translateY() on each layer at a different speed - a simple
 * parallax). Purely decorative, sits behind all content, never intercepts
 * clicks (pointer-events: none).
 */
export function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.setProperty("--scroll-y", `${window.scrollY}`);
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={ref} className="ambient-bg" aria-hidden="true">
      <div className="ambient-glow ambient-glow-a" />
      <div className="ambient-glow ambient-glow-b" />
      <div className="ambient-glow ambient-glow-c" />
    </div>
  );
}
