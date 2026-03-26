import { useState } from 'react';
import './App.scss'
import DmxButtonComponent from './components/DmxButtonComponent.js';
import RealTimeConsole from './components/RealTimeConsole.js';
import DmxButtonDetailsComponent from './components/DmxButtonDetailsComponent.js';
import LabelledStatus from './components/LabelledStatus.js';
import { useDmxButtonsContext } from './DmxButtonsContext.js';
import MidiReader from './components/MidiReader.js';
import ProgramSelect from './components/ProgramSelect.js';
import { playDmxButton } from './ApiClient.js';


function App() {
  const [wsState, setWsState] = useState('')
  const [enttecOpenUSBState, setEnttecOpenUSBState] = useState('Not connected' as USBDeviceState)

  const { dmxButtons, program, selectedDmxButtonId, setSelectedDmxButtonId, createDmxButtonAndSync } = useDmxButtonsContext()

  const selectAndPlayDmxButton = (dmxButtonId: string) => {
    setSelectedDmxButtonId(dmxButtonId)
    playDmxButton(dmxButtonId)
  }

  const selectedDmxButton = dmxButtons.find(({id}) => id == selectedDmxButtonId)

  return (
      <div className="panels">
        

        <div className="central-panel">
            <div>
              <LabelledStatus label='Server' status={wsState == 'Open' ? 'Green' : 'Red' }/>
              <LabelledStatus label='Enttec OpenUSB' status={
                ({
                  'Not connected': 'Red',
                  'Connected': 'Green',
                  'Initializing': 'Orange',
                  'Identified': 'Orange',
                }[enttecOpenUSBState] || 'Red') as ('Green' | 'Orange' | 'Red')
              }/>
              <div className='left-and-right'>
                <ProgramSelect/>
                { program && <MidiReader/>}
              </div>
          </div>


          { program && <div className='dmx-buttons'>
            { dmxButtons.map((dmxButton: DmxButton) => (
              <DmxButtonComponent
                key={dmxButton.id}
                onTap={() => {
                  selectAndPlayDmxButton(dmxButton.id)
                }}
                selected={selectedDmxButtonId == dmxButton.id}
                isPlaying={false}
                dmxButton={dmxButton}/>
              ))}

              { dmxButtons.length < 12 && <div className='empty-btn' onClick={createDmxButtonAndSync}>NEW DMX BUTTON</div>}
          </div>}

          
          { program && selectedDmxButton && <DmxButtonDetailsComponent dmxButton={selectedDmxButton}/>}
          { program && !selectedDmxButton && <div className='dmx-button-details-placeholder'>
            Select a button to edit
          </div>}

          { <RealTimeConsole
            setEnttecOpenUSBState={(a) => setEnttecOpenUSBState(a as USBDeviceState)}
            setWsState={setWsState}
            />}
        </div>
      </div>
  )
}

export default App

