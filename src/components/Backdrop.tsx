export default function Backdrop() {
  const motes = Array.from({ length: 22 }, (_, i) => i);
  const bg = `${import.meta.env.BASE_URL}art/cave-bg.jpg`;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})`, filter: "saturate(1.15) contrast(1.08) brightness(0.55)" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,6,15,0.35)_55%,rgba(4,6,15,0.88)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/70" />
      <div className="film-grain absolute inset-0 opacity-[0.14]" />
      {motes.map((i) => (
        <span
          key={i}
          className="absolute bottom-[-8px] rounded-full bg-cyan-100/80"
          style={{
            left: `${(i * 37) % 100}%`,
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            animation: `ember-rise ${9 + (i % 8)}s linear ${i * 0.55}s infinite`,
            ["--ember-x" as string]: `${(i % 2 === 0 ? 1 : -1) * (12 + (i % 22))}px`,
            ["--ember-op" as string]: 0.2 + (i % 5) * 0.07,
          }}
        />
      ))}
    </div>
  );
}
