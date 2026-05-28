/**
 * POS Pro — Punto de Venta Profesional
 * © Alejandro Pérez Vázquez — APV Labs
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
)

registerSW({
  onRegistered(registration) {
    if (registration) {
      console.log('Service worker registered');
    }
  },
  onRegisterError(error) {
    console.error('Service worker registration failed:', error);
  },
});
