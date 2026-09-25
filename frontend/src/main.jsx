import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './app.styles.css'
import App from './App.jsx'
import { JourneyProvider } from './context/JourneyContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <JourneyProvider>
        <App />
      </JourneyProvider>
    </BrowserRouter>
  </StrictMode>,
)
