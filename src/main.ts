import './style.css';
import { App } from './app';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const hudRoot = document.getElementById('hud') as HTMLElement;
const debugEl = document.getElementById('debug');

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam !== null ? Number(seedParam) >>> 0 : Date.now() >>> 0;

const app = new App(canvas, hudRoot, params.has('debug') ? debugEl : null, seed);

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  app.resize(window.innerWidth, window.innerHeight, dpr);
}

window.addEventListener('resize', resize);
resize();
app.start();
