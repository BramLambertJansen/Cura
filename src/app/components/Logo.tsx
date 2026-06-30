/** Cura's mark — house + heart-leaf. Single source of truth lives in public/logo.svg (also the favicon). */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return <img src="/logo.svg" width={size} height={size} alt="" aria-hidden="true" className={className} />;
}
