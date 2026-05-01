//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DmxButtonsContextProvider } from './contexts/DmxButtonsContext.tsx'
import { RealTimeContextProvider } from './contexts/RealTimeContext.tsx'
import { DmxMidiContextProvider } from './contexts/DmxMidiContext.tsx'

createRoot(document.getElementById('root')!).render(
  //<StrictMode>
  <DmxButtonsContextProvider>
    <DmxMidiContextProvider>
      <RealTimeContextProvider>
        <App />  
      </RealTimeContextProvider>
    </DmxMidiContextProvider>
  </DmxButtonsContextProvider>
  //</StrictMode>,
)
