import { Effect } from 'postprocessing';
import { Uniform, Vector3 } from 'three';

const fragmentShader = /* glsl */ `
uniform vec3 lift;
uniform vec3 gammaV;
uniform vec3 gain;
uniform float saturation;
uniform float contrast;
uniform float damagePulse;
uniform float desat;
uniform float flash;
uniform vec3 flashColor;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  c = gain * (c + lift * (1.0 - c));
  c = pow(max(c, vec3(0.0)), 1.0 / gammaV);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, saturation * (1.0 - desat));
  c = (c - 0.5) * contrast + 0.5;
  float d = distance(uv, vec2(0.5));
  c = mix(c, vec3(0.55, 0.0, 0.02), clamp(damagePulse, 0.0, 1.0) * smoothstep(0.3, 0.78, d));
  c = mix(c, flashColor, clamp(flash, 0.0, 1.0));
  outputColor = vec4(max(c, vec3(0.0)), inputColor.a);
}
`;

/** Correção de cor por mapa (lift/gamma/gain, saturação, contraste) + pulso de dano e flashes. */
export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['lift', new Uniform(new Vector3(0, 0, 0))],
        ['gammaV', new Uniform(new Vector3(1, 1, 1))],
        ['gain', new Uniform(new Vector3(1, 1, 1))],
        ['saturation', new Uniform(1)],
        ['contrast', new Uniform(1)],
        ['damagePulse', new Uniform(0)],
        ['desat', new Uniform(0)],
        ['flash', new Uniform(0)],
        ['flashColor', new Uniform(new Vector3(1, 1, 1))],
      ]),
    });
  }

  u(name: string): Uniform {
    return this.uniforms.get(name)!;
  }
}

/** Exposição aplicada antes do tone mapping (HDR linear). */
export class ExposureEffect extends Effect {
  constructor(exposure = 1.5) {
    super(
      'ExposureEffect',
      /* glsl */ `
uniform float exposure;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(inputColor.rgb * exposure, inputColor.a);
}`,
      { uniforms: new Map<string, Uniform>([['exposure', new Uniform(exposure)]]) },
    );
  }

  set exposure(v: number) {
    this.uniforms.get('exposure')!.value = v;
  }
}
