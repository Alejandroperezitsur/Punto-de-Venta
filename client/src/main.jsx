/**
 * POS Pro — Punto de Venta Profesional
 * © Alejandro Pérez Vázquez — APV Labs
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { ThemeProvider } from './context/ThemeContext'
import i18n from './i18n'
import App from './App'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <HashRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </HashRouter>
    </I18nextProvider>
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
