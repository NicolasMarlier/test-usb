//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DmxButtonsContextProvider } from './contexts/DmxButtonsContext.tsx'
import { RealTimeContextProvider } from './contexts/RealTimeContext.tsx'

createRoot(document.getElementById('root')!).render(
  //<StrictMode>
  <DmxButtonsContextProvider>
    <RealTimeContextProvider>
      <App />
    </RealTimeContextProvider>
  </DmxButtonsContextProvider>
  //</StrictMode>,
)
