import './App.scss'
import DmxScene from './components/DmxScene/DmxScene.js';
import DmxButtonDetails from './components/DmxButtonDetails/DmxButtonDetails.js';
import ProgramSelect from './components/ProgramSelect/ProgramSelect.js';
import DmxButtonsCollection from './components/DmxButtonsCollection/DmxButtonsCollection.js';
import MidiPlayer from './components/MidiPlayer/MidiPlayer.js';
import Statuses from './components/Statuses/Statuses.js';


function App() {
  return (
      <div className="panels">
        <div className="central-panel">
          <Statuses/>
          
          <div className='left-and-right'>
            <ProgramSelect/>
            <MidiPlayer/>
          </div>

          <DmxButtonsCollection/>
          
          <DmxButtonDetails/>

          <DmxScene/>
        </div>
      </div>
  )
}

export default App

