// Roguelite mutation deck — one permanent upgrade per world cleared.
// This is the systemic twist that classic runners don't have.
export const MUTATIONS = [
  {
    id: 'twinheart', name: 'TWIN CORE', icon: '❖', color: '#7affd4', repeatable: true,
    desc: '+1 integrity core. Survive one more impact.',
    apply: (g) => { g.maxIntegrity++; g.integrity++; g.ui.buildIntegrity(g.maxIntegrity); g.ui.setIntegrity(g.integrity); },
  },
  {
    id: 'doublejump', name: 'AERO SPUR', icon: '⇈', color: '#2ff5ff',
    desc: 'Unlock a mid-air second jump.',
    apply: (g) => { g.mods.doubleJump = true; },
  },
  {
    id: 'magnet', name: 'BIO MAGNET', icon: '◎', color: '#ffd23f',
    desc: 'Permanently attract orbs from 3 metres away.',
    apply: (g) => { g.mods.magnetRadius += 3; },
  },
  {
    id: 'richorbs', name: 'DENSE PLASMA', icon: '◆', color: '#ffb23f',
    desc: 'Orbs are worth +60% score and charge Overdrive faster.',
    apply: (g) => { g.mods.orbValue *= 1.6; },
  },
  {
    id: 'ghostphase', name: 'GHOST WEAVE', icon: '◈', color: '#ff3ea5',
    desc: 'After a phase shift you ignore phase walls for 1.2s.',
    apply: (g) => { g.mods.phaseGrace = 1.2; },
  },
  {
    id: 'dampener', name: 'REAPER DAMPENER', icon: '⌁', color: '#ff5a5a',
    desc: 'The Reaper falls behind twice as fast after a hit.',
    apply: (g) => { g.mods.hunterRecover += 1.6; },
  },
  {
    id: 'titan', name: 'TITAN RESERVE', icon: '⚡', color: '#b44bff',
    desc: 'Overdrive charges 40% faster and lasts 2s longer.',
    apply: (g) => { g.mods.odGain *= 1.4; g.mods.odTime += 2; },
  },
  {
    id: 'slipstream', name: 'SLIPSTREAM', icon: '»', color: '#39ff9e',
    desc: 'Wider close-call window and double close-call points.',
    apply: (g) => { g.mods.closeCallMargin += 0.35; g.mods.closeCallMult *= 2; },
  },
  {
    id: 'cushion', name: 'KINETIC CUSHION', icon: '⬡', color: '#39c6ff',
    desc: 'Start each new world with a free absorbing shield.',
    apply: (g) => { g.mods.worldShield = true; g.giveShield(6); },
  },
  {
    id: 'chrono', name: 'CHRONO GLAND', icon: '◷', color: '#c0f9ff',
    desc: 'Close calls slow time for longer, and heal 4% Overdrive.',
    apply: (g) => { g.mods.slowmoBonus += 0.25; g.mods.closeCallCharge += 4; },
  },
];
