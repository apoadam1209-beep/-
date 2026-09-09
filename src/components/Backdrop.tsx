export default function Backdrop() {
  const motes = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(45,212,191,0.08),transparent_42%)]" />
      <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-400/5 blur-3xl" />
      {motes.map((i) => (
        <span
          key={i}
          className="absolute bottom-[-8px] rounded-full bg-cyan-200"
          style={{
            left: `${(i * 37) % 100}%`,
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            animation: `ember-rise ${8 + (i % 7)}s linear ${i * 0.6}s infinite`,
            ["--ember-x" as string]: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 20))}px`,
            ["--ember-op" as string]: 0.25 + (i % 5) * 0.08,
          }}
        />
      ))}
    </div>
  );
}
