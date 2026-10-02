/* Anatomy-aware, continuous sprite skinning. Original artwork is 768 x 512 per
 * cell: u points right and v down. Landmarks below were measured on the three
 * creature atlases. Each displacement is evaluated on the REST coordinates so
 * neighbouring mesh vertices share exactly the same smooth deformation field.
 * No whole-sprite rotation, squash, translation, or scaling happens here. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const ASPECT = 1.5;
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const ramp = (a, b, x) => smooth((x - a) / (b - a));

  // Rotate a soft-skinned limb around its anatomical root. Coordinates are
  // converted to pixel aspect before rotating; otherwise a round joint would
  // shear when the atlas cell is wider than it is tall. The root is motionless.
  function limb(p, u, v, ax, ay, bx, by, width, angle, strength = 1) {
    const dx = (u - ax) * ASPECT, dy = v - ay;
    const lx = (bx - ax) * ASPECT, ly = by - ay;
    const length2 = lx * lx + ly * ly;
    const t = (dx * lx + dy * ly) / length2;
    const across = Math.abs(dx * ly - dy * lx) / Math.sqrt(length2);
    const weight = ramp(0.02, 0.78, t) * (1 - ramp(width * 0.45, width, across))
      * (1 - ramp(1.25, 2.5, t)) * strength;
    if (!weight) return;
    const c = Math.cos(angle), s = Math.sin(angle);
    p[0] += ((c - 1) * dx - s * dy) / ASPECT * weight;
    p[1] += (s * dx + (c - 1) * dy) * weight;
  }

  // A rearward-travelling wave. The head and forward trunk (u >= anchor) are
  // exactly stable; curvature grows continuously towards the caudal peduncle.
  function tail(p, u, v, phase, anchor, tip, amplitude, lag = 1.5) {
    const q = ramp(0, 1, (anchor - u) / (anchor - tip));
    p[1] += amplitude * q * q * Math.sin(phase - q * lag);
    p[0] += amplitude * 0.15 * q * q * Math.sin(phase * 2 - q * lag);
  }

  const rigs = {
    whale(u, v, t) {
      const p = [u, v];
      // Eye .67,.42; tail stock .33,.48, vertical flukes .23,.30.
      tail(p, u, v, t, .49, .16, .068, 1.15);
      limb(p,u,v,.32,.47,.23,.28,.22,.13*Math.sin(t-.6));
      // Long near pectoral fin and smaller far fin move out of phase.
      limb(p,u,v,.61,.52,.32,.75,.155,.15*Math.sin(t+.65));
      limb(p,u,v,.72,.60,.81,.80,.105,-.14*Math.sin(t+1.5));
      return p;
    },
    goldshark(u, v, t) {
      const p = [u, v];
      // Head .79,.48; narrow tail stock .34,.52 and fan .24,.49.
      tail(p,u,v,t,.58,.22,.064,1.7);
      limb(p,u,v,.56,.61,.38,.80,.14,.15*Math.sin(t+.8));
      limb(p,u,v,.72,.67,.76,.82,.095,-.12*Math.sin(t+1.5));
      limb(p,u,v,.57,.36,.49,.18,.11,.055*Math.sin(t-.4));
      return p;
    },
    lobster(u, v, t) {
      const p = [u, v];
      // Head .56,.36 and thorax .45,.36 are rigid. Art faces lower-right.
      limb(p,u,v,.38,.32,.23,.30,.16,.10*Math.sin(t-.4));
      // Six walking/swimming legs, each with a delayed power stroke.
      const legs = [[.39,.44,.22,.64,.10],[.43,.46,.30,.69,.09],
        [.46,.48,.39,.69,.085],[.62,.42,.71,.58,.08],
        [.62,.47,.73,.66,.08],[.62,.51,.70,.73,.08]];
      legs.forEach((a,i)=>limb(p,u,v,...a,.13*Math.sin(t*2+i*1.3)));
      // Large claws hinge from the forearms, not from their image centres.
      limb(p,u,v,.47,.48,.57,.71,.19,.13*Math.sin(t+.25));
      limb(p,u,v,.68,.38,.84,.62,.19,-.13*Math.sin(t+1.55));
      // Antennae have a slow travelling flex independent of the claw rhythm.
      limb(p,u,v,.59,.34,.32,.10,.13,.070*Math.sin(t+.7));
      limb(p,u,v,.64,.34,.82,.12,.13,-.075*Math.sin(t+1.7));
      return p;
    },
    octopus(u, v, t) {
      const p = [u, v];
      // Mantle/eyes live inside (.40..65,.09..43). Eight arm roots sit
      // around the lower mantle; each arm receives a different phase delay.
      // Rear arms curve upward, so a global lower-half wave would miss them.
      const arms = [
        [.43,.46,.21,.40,.16,.13,0.0],
        [.44,.42,.33,.24,.12,.15,.8],
        [.44,.54,.29,.69,.17,.17,1.6],
        [.49,.59,.46,.83,.15,.17,2.4],
        [.57,.58,.68,.72,.16,.17,3.2],
        [.62,.54,.79,.75,.16,.15,4.0],
        [.65,.45,.84,.36,.15,.15,4.8],
        [.64,.39,.72,.23,.12,.13,5.6]
      ];
      arms.forEach(a=>limb(p,u,v,...a.slice(0,5),a[5]*Math.sin(t-a[6])));
      return p;
    },
    ray(u, v, t) {
      const p = [u, v];
      // Eye .76,.57 is fixed; two broad pectoral wings have separate roots.
      limb(p,u,v,.65,.52,.54,.24,.235,.22*Math.sin(t));
      limb(p,u,v,.64,.63,.35,.74,.225,-.17*Math.sin(t+.38));
      // The thin tail curls behind the shoulders after the wing downstroke.
      limb(p,u,v,.47,.56,.24,.47,.085,.15*Math.sin(t-1.1));
      limb(p,u,v,.28,.49,.18,.32,.09,.12*Math.sin(t-1.9));
      return p;
    },
    seahorse(u, v, t) {
      const p = [u, v];
      // Upright skull .58,.29 and plated chest .58,.48 remain stable.
      // The small dorsal fin beats much faster than the curling prehensile tail.
      limb(p,u,v,.51,.49,.42,.49,.18,.19*Math.sin(t*3));
      limb(p,u,v,.55,.64,.56,.80,.145,.11*Math.sin(t-.4));
      limb(p,u,v,.57,.80,.62,.77,.085,.12*Math.sin(t-1.1));
      return p;
    },
    crab(u, v, t) {
      const p = [u, v];
      // Carapace .43..66,.39..62; six legs alternate left/right phases.
      const legs = [[.40,.52,.23,.62,.095],[.43,.58,.29,.74,.095],
        [.47,.62,.43,.80,.09],[.65,.53,.82,.64,.09],
        [.63,.58,.76,.76,.09],[.59,.63,.67,.82,.09]];
      legs.forEach((a,i)=>limb(p,u,v,...a,.13*Math.sin(t*2+i*1.7)));
      // Arm hinges lift the two jeweled claws at different points in the stroke.
      limb(p,u,v,.41,.51,.34,.29,.17,-.13*Math.sin(t));
      limb(p,u,v,.66,.50,.72,.29,.17,.13*Math.sin(t+1.1));
      return p;
    },
    dragonfish(u, v, t) {
      const p = [u, v];
      // Eye .77,.47; serpentine caudal stock .39,.53 leads the large fan.
      tail(p,u,v,t,.62,.22,.070,2.0);
      limb(p,u,v,.60,.62,.48,.78,.15,.14*Math.sin(t+.5));
      limb(p,u,v,.72,.64,.70,.76,.11,-.10*Math.sin(t+1.2));
      // Filaments above the head ripple while the skull remains unmoved.
      limb(p,u,v,.68,.38,.58,.25,.09,.07*Math.sin(t-1.1));
      return p;
    },
    clownfish(u, v, t) {
      const p = [u, v];
      // Eye .70,.48; tail root .33,.52, caudal fan .23,.51.
      tail(p,u,v,t,.61,.23,.053,1.4);
      limb(p,u,v,.57,.57,.50,.56,.10,.17*Math.sin(t*2+.4));
      limb(p,u,v,.56,.65,.55,.73,.09,.11*Math.sin(t+.9));
      limb(p,u,v,.55,.36,.56,.28,.095,.06*Math.sin(t-.4));
      return p;
    },
    tang(u, v, t) {
      const p = [u, v];
      // Eye .70,.46; tail root .38,.53, caudal fan .24,.51.
      tail(p,u,v,t,.61,.24,.050,1.5);
      limb(p,u,v,.63,.58,.58,.55,.085,.20*Math.sin(t*2));
      limb(p,u,v,.57,.68,.56,.76,.09,.10*Math.sin(t+.7));
      limb(p,u,v,.52,.36,.49,.27,.13,.055*Math.sin(t-.6));
      return p;
    },
    butterfly(u, v, t) {
      const p = [u, v];
      // Eye .66,.47; tall posterior fins undulate with the caudal wave.
      tail(p,u,v,t,.59,.25,.044,1.45);
      limb(p,u,v,.58,.58,.52,.56,.085,.18*Math.sin(t*2+.4));
      limb(p,u,v,.48,.71,.41,.80,.12,.085*Math.sin(t-.4));
      limb(p,u,v,.46,.29,.35,.19,.12,.065*Math.sin(t-.9));
      return p;
    },
    turtle(u, v, t) {
      const p = [u, v];
      // Shell .33..65,.30..57 and eye .79,.31 are rigid. The large front
      // flippers sweep at the shoulders; rear flippers perform steering strokes.
      limb(p,u,v,.62,.53,.45,.79,.19,.22*Math.sin(t));
      limb(p,u,v,.73,.48,.81,.69,.125,-.20*Math.sin(t+.65));
      limb(p,u,v,.34,.54,.20,.65,.12,-.16*Math.sin(t+1.25));
      limb(p,u,v,.29,.45,.20,.48,.075,.10*Math.sin(t+1.9));
      return p;
    }
  };

  const frequencies = Object.freeze({whale:.70,goldshark:1.0,lobster:.95,
    octopus:.66,ray:.76,seahorse:1.15,crab:1.05,dragonfish:.88,
    clownfish:1.70,tang:1.65,butterfly:1.45,turtle:.68});
  const ids = Object.freeze(Object.keys(rigs));
  function deform(id, u, v, phase = 0) {
    if (!Number.isFinite(u) || !Number.isFinite(v)) return [u, v];
    const rig = rigs[id];
    if (!rig) return [u, v];
    const t = Number.isFinite(phase) ? phase % TAU : 0;
    // Integrate the smooth skin velocity in short steps. Applying all joint
    // offsets at once can fold triangles near a narrow limb's edge. Following
    // the continuous field keeps that skin attached without reducing the stroke.
    let p = [u, v];
    for (let step = 0; step < 6; step++) {
      const next = rig(p[0], p[1], t);
      p = [p[0] + (next[0] - p[0]) / 6, p[1] + (next[1] - p[1]) / 6];
    }
    return p;
  }
  const api = Object.freeze({ids, frequencies, deform});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FishRigs = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
