import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ui/tema.css'
import './dueno.css'
import App from './App.jsx'

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
