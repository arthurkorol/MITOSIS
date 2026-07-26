import './style.css';
import { Game } from './scene/game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const hudRoot = document.getElementById('hud') as HTMLElement;
const debugEl = document.getElementById('debug');

const params = new URLSearchParams(location.search);
const parsedSeed = Number(params.get('seed'));
const seed = Number.isFinite(parsedSeed) && params.get('seed') !== null
  ? parsedSeed >>> 0
  : Date.now() >>> 0;

try {
  new Game(canvas, hudRoot, params.has('debug') ? debugEl : null, seed);
} catch (err) {
  const msg = document.createElement('div');
  msg.style.cssText =
    'position:fixed;inset:0;display:grid;place-items:center;color:#9fd9c8;' +
    'font:16px system-ui;text-align:center;padding:24px;';
  msg.textContent =
    'Не удалось запустить WebGL2. Обновите браузер или включите аппаратное ускорение. / ' +
    'WebGL2 is unavailable. Please update your browser or enable hardware acceleration.';
  document.body.appendChild(msg);
  console.error(err);
}
