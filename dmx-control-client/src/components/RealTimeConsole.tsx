import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import LedBar from "../DMXDevices/LedBar";
import { useDmxButtonsContext } from "../DmxButtonsContext";

interface Props {
  setEnttecOpenUSBState: (state: string) => void
  setWsState: (state: string) => void
}

const WS_URL = `ws://127.0.0.1:8080`

const RealTimeConsole = (props: Props) => {
    const { setEnttecOpenUSBState, setWsState } = props
    const { dmxButtons, selectedDmxButtonId, programs, setProgram, setLastSignal, setMidiCurrentTick } = useDmxButtonsContext()
    const [dmxHexSignal, setDmxHexSignal] = useState("");

    const { sendJsonMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
      shouldReconnect: () => true,
      queryParams: { },
      share: true,
      onError: (error) => {
        console.error('WebSocket connection error:', error)
      }
    })

    const { updateDmxButtonAndSync } = useDmxButtonsContext()

    const selectedPods = dmxButtons.find(({id}) => selectedDmxButtonId == id)?.offsets || []

    const onSelectPod = (pod: number, selected: boolean) => {
      if(!selectedDmxButtonId) return

      if(selected) {
        updateDmxButtonAndSync(selectedDmxButtonId, {offsets: [...selectedPods, ...[pod]]})
      }
      else {
        updateDmxButtonAndSync(selectedDmxButtonId, {offsets: selectedPods.filter(offset => offset !=pod)})
      }
    }

    useEffect(() => {
      const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
      }[readyState];
      
      setWsState(connectionStatus);
    }, [readyState])


    useEffect(() => {
      if(lastMessage !== null) {
        const jsonMessage = JSON.parse(lastMessage.data)
        if(jsonMessage.channel === 'dmx') {
          const {
            enttecOpenDMXUSB: {
              state: state
            },
            dmxHexSignal: dmxHexSignal,
            midiCurrentTick: midiCurrentTick
          } = jsonMessage.data
          setEnttecOpenUSBState(state)
          setDmxHexSignal(dmxHexSignal)
          setMidiCurrentTick(midiCurrentTick)
        }
        else if(jsonMessage.channel === 'control') {
          if(jsonMessage.action == 'change_program') {
            setProgram(programs.find((p) => p.id == jsonMessage.data.program_id))
          }
        }
        else if(jsonMessage.channel === 'midi_input') {
          if(jsonMessage.action == 'note_on') {
            setLastSignal(["midi", jsonMessage.data.data1, Date.now()].join('|'))
          }
        }
        else {
          console.log(jsonMessage)
        }
      }
    }, [lastMessage, programs])

    return <div>
      <LedBar dmxHexSignal={dmxHexSignal} size={8} channel={1} selectedPods={selectedPods} onSelectPod={onSelectPod}/>
      <LedBar dmxHexSignal={dmxHexSignal} size={8} channel={25} selectedPods={selectedPods} onSelectPod={onSelectPod}/>
    </div>
}

export default RealTimeConsole
