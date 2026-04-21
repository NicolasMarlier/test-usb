import { createContext, useContext, useEffect, useState } from "react"
import useWebSocket, { ReadyState } from "react-use-websocket"
import { useDmxButtonsContext } from "./DmxButtonsContext"

interface RealTimeContextType {
    webSocketReadyState: ReadyState
    midiCurrentTick: number,
    setMidiCurrentTick: (tick: number) => void
    lastReceivedMidiKey: ReceivedMidiKey | undefined
    setLastReceivedMidiKey: (received_midi_key: ReceivedMidiKey | undefined) => void

    dmxHexSignal: DmxHexSignal,
    enttecOpenUSBState: USBDeviceState
}

const WS_URL = `ws://127.0.0.1:8080`

const RealTimeContext = createContext<RealTimeContextType | null>(null)

export const useRealTimeContext = () => {
  const realTimeContext = useContext(RealTimeContext);

  if (!realTimeContext) {
    throw new Error(
      "useCurrentUser has to be used within <RealTimeContext.Provider>"
    );
  }
  return realTimeContext
}

export const RealTimeContextProvider = ({ children }: {children: React.ReactNode}) => {
    const { setCurrentProgramId, syncPrograms, programs } = useDmxButtonsContext()

    const [midiCurrentTick, setMidiCurrentTick] = useState(0)
    const [lastReceivedMidiKey, setLastReceivedMidiKey] = useState(
        undefined as ReceivedMidiKey | undefined
    )

    const [enttecOpenUSBState, setEnttecOpenUSBState] = useState('Not connected' as USBDeviceState)
    const [dmxHexSignal, setDmxHexSignal] = useState("" as DmxHexSignal);
    

    const { lastMessage, readyState } = useWebSocket(WS_URL, {
          shouldReconnect: () => true,
          queryParams: { },
          share: true,
          onError: (error) => {
            console.error('WebSocket connection error:', error)
          }
    })

    useEffect(() => {
      if(!!lastReceivedMidiKey) {
        const intervalId = setTimeout(() => setLastReceivedMidiKey(undefined), 1000)
        return () => clearInterval(intervalId)
      }
    }, [lastReceivedMidiKey])

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
            setCurrentProgramId(jsonMessage.data.program_id)
            syncPrograms()
          }
        }
        else if(jsonMessage.channel === 'midi_input') {
          if(jsonMessage.action == 'note_on') {
            const message = jsonMessage.data as WSMidiNoteOnMessage
            setLastReceivedMidiKey({
              midi: message.midi,
              at: Date.now()
            })
          }
        }
        else {
          console.log("Received unknown WS message", jsonMessage)
        }
      }
    }, [lastMessage, programs])
    

    return (
        <RealTimeContext.Provider value={ {
            lastReceivedMidiKey,
            setLastReceivedMidiKey,
            
            midiCurrentTick,
            setMidiCurrentTick,

            dmxHexSignal,

            webSocketReadyState: readyState,
            enttecOpenUSBState
            } }>
            {children}
        </RealTimeContext.Provider>
    )
}
