import { Color, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, Vector3, Vector4 } from 'three';
import { getCharacter } from '../data/characters';
import type { CharacterId } from '../data/types';
import { makeFighter, makeTransform, type Entity } from '../sim/Entity';
import type { Renderer } from './Renderer';
import { characterRig, characterStyle } from './rig/characterRigs';
import { CosmeticRig } from './views/Attachments';
import { CharacterView } from './views/CharacterView';

const _head = new Vector3();
const _vp = new Vector4();

/**
 * Fotografa o rosto de um personagem (cartões do menu Personagens): desenha num canto do próprio canvas do jogo
 * e recorta a imagem. Deve rodar logo antes do quadro normal, que apaga o canto em seguida (nada aparece na tela).
 */
export function renderPortrait(r: Renderer, id: CharacterId, size = 256): string | null {
  const gl = r.gl;
  const canvas = gl.domElement;
  const px = Math.min(size, canvas.width, canvas.height);
  if (px < 32) return null;
  const pr = gl.getPixelRatio();
  const c = getCharacter(id);
  const scene = new Scene();
  scene.background = new Color(0x151823);
  scene.add(new HemisphereLight(0xdde6ff, 0x2a2230, 1.8));
  const key = new DirectionalLight(0xfff0dc, 3.2);
  key.position.set(1.4, 2.4, 3);
  const rim = new DirectionalLight(c.color, 2.6);
  rim.position.set(-2.2, 1.6, -1.2);
  scene.add(key, rim);
  const st = characterStyle(id);
  const v = new CharacterView(
    characterRig(id),
    r.quality.standardMaterials,
    { hunch: st.hunch, zombieArms: false, heavy: false },
    st.scale,
  );
  // peça de cabeça própria (chapéu da maga)
  const cos = new CosmeticRig(v);
  cos.set({});
  const e: Entity = {
    id: 0,
    kind: 'enemy',
    team: 'enemies',
    defId: '',
    alive: true,
    age: 0,
    t: makeTransform(0, 0, 0, 1),
    fighter: makeFighter('idle'),
    body: { radius: 0.35, height: 1.8, mass: 1, grounded: true, gravityScale: 1 },
  };
  v.sync(e, 1, 1 / 60, null);
  v.yaw.rotation.y = 0.3;
  scene.add(v.group);
  scene.updateMatrixWorld(true);
  (v.socket('face') ?? v.group).getWorldPosition(_head);
  const cam = new PerspectiveCamera(28, 1, 0.05, 20);
  cam.position.set(_head.x + 0.28, _head.y + 0.06, _head.z + 1.45);
  cam.lookAt(_head.x, _head.y - 0.04, _head.z);
  gl.getViewport(_vp);
  const side = px / pr;
  gl.setRenderTarget(null);
  gl.setScissorTest(true);
  gl.setViewport(0, 0, side, side);
  gl.setScissor(0, 0, side, side);
  let url: string | null = null;
  try {
    gl.render(scene, cam);
    const out = document.createElement('canvas');
    out.width = out.height = size;
    out.getContext('2d')?.drawImage(canvas, 0, canvas.height - px, px, px, 0, 0, size, size);
    url = out.toDataURL('image/png');
  } catch {
    url = null;
  } finally {
    gl.setScissorTest(false);
    gl.setViewport(_vp);
    cos.dispose();
    v.dispose();
  }
  return url;
}
