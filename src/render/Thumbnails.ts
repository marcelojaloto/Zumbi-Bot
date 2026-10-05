import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  Vector4,
} from 'three';
import type { MeshRecipe } from '../data/types';
import { recipeMesh } from './meshCache';
import type { Renderer } from './Renderer';

const _vp = new Vector4();
const _size = new Vector3();
const _center = new Vector3();
const cache = new Map<string, string>();

/**
 * Fotografa um objeto (prêmio do baú: cosmético, arma, cajado) para a interface: desenha a receita num canto do
 * próprio canvas do jogo e recorta a imagem, como os rostos dos personagens. Fica guardada pelo `key`.
 */
export function renderThumb(
  r: Renderer,
  key: string,
  recipe: MeshRecipe,
  o: { size?: number; yaw?: number; pitch?: number; tint?: number } = {},
): string | null {
  const hit = cache.get(key);
  if (hit) return hit;
  const size = o.size ?? 160;
  const gl = r.gl;
  const canvas = gl.domElement;
  const px = Math.min(size, canvas.width, canvas.height);
  if (px < 32) return null;
  const pr = gl.getPixelRatio();
  const scene = new Scene();
  scene.background = new Color(0x000000);
  scene.add(new HemisphereLight(0xe8eeff, 0x2a2230, 2));
  const key1 = new DirectionalLight(0xfff0dc, 3);
  key1.position.set(1.5, 2.5, 3);
  const rim = new DirectionalLight(o.tint ?? 0x8ad8ff, 2.2);
  rim.position.set(-2, 1.2, -1.5);
  scene.add(key1, rim);
  const obj = recipeMesh(`thumb:${key}`, recipe, { shadow: false });
  obj.rotation.set(o.pitch ?? 0.35, o.yaw ?? 0.6, 0);
  scene.add(obj);
  scene.updateMatrixWorld(true);
  // enquadra o objeto inteiro (chapéu pequeno ou cajado comprido)
  const box = new Box3().setFromObject(obj);
  box.getSize(_size);
  box.getCenter(_center);
  const radius = Math.max(0.05, _size.length() / 2);
  const cam = new PerspectiveCamera(30, 1, 0.01, 50);
  const dist = radius / Math.sin((30 * Math.PI) / 360) + 0.05;
  cam.position.set(_center.x, _center.y + radius * 0.15, _center.z + dist);
  cam.lookAt(_center);
  gl.getViewport(_vp);
  const side = px / pr;
  let url: string | null = null;
  try {
    gl.setRenderTarget(null);
    gl.setScissorTest(true);
    gl.setViewport(0, 0, side, side);
    gl.setScissor(0, 0, side, side);
    gl.render(scene, cam);
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const ctx = out.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, canvas.height - px, px, px, 0, 0, size, size);
      // fundo preto vira transparente (o prêmio aparece solto em volta do baú)
      const img = ctx.getImageData(0, 0, size, size);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const m = Math.max(d[i]!, d[i + 1]!, d[i + 2]!);
        if (m < 10) d[i + 3] = 0;
      }
      ctx.putImageData(img, 0, 0);
      url = out.toDataURL('image/png');
    }
  } catch {
    url = null;
  } finally {
    gl.setScissorTest(false);
    gl.setViewport(_vp);
  }
  if (url) cache.set(key, url);
  return url;
}
