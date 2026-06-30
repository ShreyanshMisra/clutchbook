import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { OverlayDemo } from './components/Overlay/OverlayDemo';
import { ElectronApp } from './ElectronApp';
import { FaceitLab } from './components/Lab/FaceitLab';
import './index.css';

const params = new URLSearchParams(window.location.search);

const root = (() => {
  if (params.has('electron')) return <ElectronApp />;      // Electron overlay renderer
  if (params.has('overlay'))  return <OverlayDemo />;      // Layer-1 web demo
  if (params.has('lab'))      return <FaceitLab />;        // FaceIt dev sandbox
  return <App />;                                          // Normal web app
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>{root}</StrictMode>,
);
