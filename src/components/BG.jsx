// src/components/HUDBackground.jsx

export default function HUDBackground() {
  return (
    <>
      {/* glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.10),transparent_70%)]" />
      {/* texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-screen bg-[url('/cream-pixels.png')] bg-repeat bg-size-[180px_180px]" />
      {/* scanlines */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(57,255,20,0.03)_51%)] bg-size-[100%_4px]" />
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_45%,rgba(0,0,0,0.85)_100%)]" />
    </>
  );
}