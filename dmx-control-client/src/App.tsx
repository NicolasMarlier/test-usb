import { useCallback, useState } from 'react';
import './App.scss'
import DmxButton from './models/DmxButton.js';
import DmxButtonComponent from './components/DmxButtonComponent.js';
import RealTimeConsole from './components/RealTimeConsole.js';
import DmxButtonDetailsComponent from './components/DmxButtonDetailsComponent.js';
import LabelledStatus from './components/LabelledStatus.js';
import { useDmxButtonsContext } from './DmxButtonsContext.js';
import SignalManager from './components/SignalManager.js';
import Signal from './models/Signal.js';
import MidiReader from './components/MidiReader.js';
import ProgramSelect from './components/ProgramSelect.js';


function App() {
  const [wsState, setWsState] = useState('')
  const [enttecOpenUSBState, setEnttecOpenUSBState] = useState('Not connected' as USBDeviceState)

  const { dmxButtons, selectedDmxButtonUuid, setSelectedDmxButtonUuid, playDmxButtons, updateDmxButton } = useDmxButtonsContext()

  const registerSignal = useCallback((signal: Signal) => {
    selectedDmxButtonUuid && updateDmxButton(selectedDmxButtonUuid, {signal})
  }, [selectedDmxButtonUuid])


  return (
      <div className="panels">
        <div className="left-panel"/>
        <ProgramSelect/>

        <div className="central-panel">
          <div className='left-and-right'>
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
            </div>

            <SignalManager
              registerSignal={registerSignal}
              />
          </div>

          <div className='dmx-buttons'>
            { dmxButtons.map((dmxButton: DmxButton) => (
              <DmxButtonComponent
                key={dmxButton.uuid}
                onTap={() => {
                  playDmxButtons([dmxButton.uuid])
                }}
                selected={selectedDmxButtonUuid == dmxButton.uuid}
                isPlaying={dmxButton.isPlaying()}
                dmxButtonConfig={dmxButton.dmxButtonConfig}/>
              ))}
          </div>

        <div></div>
          
          <DmxButtonDetailsComponent/>

          <RealTimeConsole
            setEnttecOpenUSBState={(a) => setEnttecOpenUSBState(a as USBDeviceState)}
            setWsState={setWsState}
            />
        </div>

        <div className="right-panel">
          {/* <h1>DMX Controller</h1> */}
          <MidiReader/>
        </div>
      </div>
  )
}

export default App

