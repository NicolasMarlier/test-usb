import './App.scss'
import DmxScene from './components/DmxScene/DmxScene.js';
import DmxButtonDetails from './components/DmxButtonDetails/DmxButtonDetails.js';
import ProgramSelect from './components/ProgramSelect/ProgramSelect.js';
import DmxButtonsCollection from './components/DmxButtonsCollection/DmxButtonsCollection.js';
import MidiPlayer from './components/MidiPlayer/TrackEditor.js';
import Statuses from './components/Statuses/Statuses.js';
import { useDmxButtonsContext } from './contexts/DmxButtonsContext.js';
import DebugConsole from './components/DebugConsole/DebugConsole.js';
import { useRealTimeContext } from './contexts/RealTimeContext.js';
import NoteEditor from './components/MidiPlayer/NoteEditor.js';
import { useDmxMidiContext } from './contexts/DmxMidiContext.js';
import SmallButton from './components/DesignSystem/SmallButton/SmallButton.js';
import { RecordIcon } from './components/DesignSystem/Icons.js';
import AudioPlayer from './components/MidiPlayer/AudioPlayer.js';



function App() {
  const { program } = useDmxButtonsContext()
  const { selectedMidiPatterns, isRecording, setIsRecording } = useDmxMidiContext()
  const { debug } = useRealTimeContext()
  
  return (
      <div id="app">
        { debug && <DebugConsole/>}
        
        <div className='section commands-bar'>
          <ProgramSelect/>
          <Statuses/>
          <div className="small-buttons-bar">
            <SmallButton
                value={isRecording}
                onClick={() => setIsRecording(!isRecording)}>
                <RecordIcon/>
            </SmallButton>
            <AudioPlayer/>
          </div>
        </div>

        <div className="section midi">
          { program ? <MidiPlayer program={program}/> : <></>}

          {selectedMidiPatterns.length == 1 && <NoteEditor pattern={ selectedMidiPatterns[0]}/>}
        </div>

        <div className="section dmx">
          <DmxButtonDetails/>
          
          <DmxButtonsCollection/>

          <DmxScene/>
        </div>
      </div>
  )
}

export default App

