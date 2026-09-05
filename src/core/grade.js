// Final colour grade.
//
// Raw renderer output looks "video game flat": uniform contrast edge to edge and
// perfectly clean pixels. Real cameras don't do that. This pass adds the cues
// the eye reads as photographic — a filmic contrast S-curve, gentle saturation
// lift, lens vignette, speed-driven chromatic aberration and a whisper of grain
// that also hides banding in the big sky gradients.
export const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.09 },
    uSaturation: { value: 1.12 },
    uVignette: { value: 0.42 },
    uAberration: { value: 0.0 }, // driven by speed / overdrive
    uGrain: { value: 0.035 },
    uTime: { value: 0 },
    uLift: { value: 0.012 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignette;
    uniform float uAberration;
    uniform float uGrain;
    uniform float uTime;
    uniform float uLift;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      vec2 fromCentre = uv - 0.5;
      float r2 = dot(fromCentre, fromCentre);

      // lateral chromatic aberration: grows toward the frame edge, and with speed
      vec3 col;
      if (uAberration > 0.0001) {
        vec2 shift = fromCentre * uAberration * (0.35 + r2);
        col.r = texture2D(tDiffuse, uv + shift).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - shift).b;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }

      // filmic contrast around mid grey, then a tiny lift so blacks read as air
      col = (col - 0.5) * uContrast + 0.5;
      col = max(col + uLift * (1.0 - col), 0.0);

      // saturation about luma
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // natural lens falloff
      col *= 1.0 - uVignette * smoothstep(0.16, 0.78, r2);

      // animated grain, strongest in the shadows where banding lives
      float g = hash(uv * 1024.0 + fract(uTime) * 91.7) - 0.5;
      col += g * uGrain * (1.25 - luma);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};
