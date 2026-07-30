// src/ecs/systems/settings.js

export const settings = {
  controlScheme: localStorage.getItem('controlScheme') ?? 'keyboard', // 'keyboard' | 'keyboardMouse'
};

export function setControlScheme(value) {
  settings.controlScheme = value;
  localStorage.setItem('controlScheme', value);
}