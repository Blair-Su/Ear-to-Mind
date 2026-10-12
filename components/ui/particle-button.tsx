"use client";

// Adapted from the KokonutUI Particle Button supplied by the user.
import * as React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Burst = {
  id: number;
  x: number;
  y: number;
  lifetime: number;
  particles: { x: number; y: number; delay: number }[];
};
type Emit = (rect: DOMRect, lifetime: number) => void;
const ParticleContext = React.createContext<Emit | null>(null);

function useParticleBurst() {
  const [burst, setBurst] = React.useState<Burst | null>(null);
  const sequence = React.useRef(0);
  const reducedMotion = useReducedMotion();
  const emit = React.useCallback<Emit>((rect, lifetime) => {
    if (reducedMotion || document.visibilityState === "hidden") return;
    setBurst({
      id: ++sequence.current,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      lifetime: Number.isFinite(lifetime) ? Math.max(1000, Math.min(2000, lifetime)) : 1000,
      // Sample once per click so moving the coachmark cannot change trajectories.
      particles: Array.from({ length: 6 }, (_, i) => ({
        x: (i % 2 ? 1 : -1) * (Math.random() * 50 + 20),
        y: -Math.random() * 50 - 20,
        delay: i * .06,
      })),
    });
  }, [reducedMotion]);
  React.useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(null), burst.lifetime);
    return () => window.clearTimeout(timer);
  }, [burst]);
  const layer = burst && !reducedMotion ? createPortal(
    <div className="particle-burst-layer" aria-hidden="true" key={burst.id}>
      {burst.particles.map((particle, i) => <motion.i
        key={i}
        className="particle-burst-dot"
        style={{ left: burst.x, top: burst.y }}
        initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
        animate={{ scale: [0, 1, 0], opacity: [0, .85, 0], x: [0, particle.x], y: [0, particle.y] }}
        transition={{ duration: .6, delay: particle.delay, ease: "easeOut" }}
      />)}
    </div>, document.body,
  ) : null;
  return { emit, layer, reducedMotion };
}

// The shared layer survives step changes and the final card disappearing.
export function ParticleButtonProvider({ children }: { children: React.ReactNode }) {
  const { emit, layer } = useParticleBurst();
  return <ParticleContext.Provider value={emit}>{children}{layer}</ParticleContext.Provider>;
}

export type ParticleButtonProps = Omit<React.ComponentProps<typeof Button>, "asChild"> & {
  effectTrigger?: "click" | "hover";
  onSuccess?: () => void;
  successDuration?: number;
};

export function ParticleButton({
  children, onClick, onPointerEnter, onFocus, onSuccess, successDuration = 1000, className,
  ref: forwardedRef, disabled, type = "button", effectTrigger = "click", ...props
}: ParticleButtonProps) {
  const sharedEmit = React.useContext(ParticleContext);
  const local = useParticleBurst();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressed, setPressed] = React.useState(false);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function showHoverBurst(button: HTMLButtonElement) {
    if (disabled || local.reducedMotion || effectTrigger !== "hover") return;
    (sharedEmit || local.emit)(button.getBoundingClientRect(), successDuration);
  }
  function handlePointerEnter(event: React.PointerEvent<HTMLButtonElement>) {
    onPointerEnter?.(event);
    if (!event.defaultPrevented && event.pointerType !== "touch") showHoverBurst(event.currentTarget);
  }
  function handleFocus(event: React.FocusEvent<HTMLButtonElement>) {
    onFocus?.(event);
    if (!event.defaultPrevented && event.currentTarget.matches(":focus-visible")) showHoverBurst(event.currentTarget);
  }
  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    const anchor = event.currentTarget;
    const rect = anchor.getBoundingClientRect();
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!local.reducedMotion) {
      if (effectTrigger === "click") (sharedEmit || local.emit)(rect, successDuration);
      setPressed(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPressed(false), 140);
    }
    onSuccess?.();
  }

  return <>
    {!sharedEmit && local.layer}
    <Button
      {...props}
      ref={forwardedRef}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onFocus={handleFocus}
      className={cn("particle-button", className)}
      data-particle-pressed={pressed || undefined}
    >{children}</Button>
  </>;
}
