import './App.scss'
import DmxScene from './components/DmxScene/DmxScene.js';
import DmxButtonDetails from './components/DmxButtonDetails/DmxButtonDetails.js';
import ProgramSelect from './components/ProgramSelect/ProgramSelect.js';
import DmxButtonsCollection from './components/DmxButtonsCollection/DmxButtonsCollection.js';
import MidiPlayer from './components/MidiPlayer/MidiPlayer.js';
import Statuses from './components/Statuses/Statuses.js';
import { useDmxButtonsContext } from './contexts/DmxButtonsContext.js';
import DebugConsole from './components/DebugConsole/DebugConsole.js';
import { useRealTimeContext } from './contexts/RealTimeContext.js';



function App() {
  const { program } = useDmxButtonsContext()
  const { debug } = useRealTimeContext()
  
  return (
      <div className="panels">
        { debug && <DebugConsole/>}
        <div className="central-panel">
          
          
          <div className='left-and-right'>
            <ProgramSelect/>
            <Statuses/>
          </div>
          { program ? <MidiPlayer program={program}/> : <></>}

          <DmxButtonsCollection/>
          
          <DmxButtonDetails/>

          <DmxScene/>
        </div>
      </div>
  )
}

export default App

