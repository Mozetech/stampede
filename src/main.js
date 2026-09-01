import './style.css';
import { Game } from './game.js';
import { UI } from './ui.js';
import { audio } from './audio.js';

const ui = new UI();
const game = new Game(document.getElementById('game'), ui);
ui.attach(game);
ui.show('title');
audio.playMusic('menu');
window.__stampede = game; // handy for debugging in the console
