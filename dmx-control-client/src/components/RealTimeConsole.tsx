import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import type DmxButton from "../models/DmxButton";
import LedBar from "../DMXDevices/LedBar";
import { useDmxButtonsContext } from "../DmxButtonsContext";

interface Props {
  setEnttecOpenUSBState: (state: string) => void
  setWsState: (state: string) => void
}

const WS_URL = `ws://127.0.0.1:8080`
const TICK_INTERVAL = 20;

const RealTimeConsole = (props: Props) => {
    const { setEnttecOpenUSBState, setWsState } = props
    const { dmxButtons, selectedDmxButtonUuid, programs, setProgram } = useDmxButtonsContext()
    const [dmxHexSignal, setDmxHexSignal] = useState("");

    const { sendJsonMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
      shouldReconnect: () => true,
      queryParams: { },
      share: true,
      onError: (error) => {
        console.error('WebSocket connection error:', error)
      }
    })

    const { updateDmxButton } = useDmxButtonsContext()

    const selectedPods = dmxButtons.find(({uuid}) => selectedDmxButtonUuid == uuid)?.dmxButtonConfig.offsets || []

    const onSelectPod = (pod: number, selected: boolean) => {
      if(selected) {
        updateDmxButton(selectedDmxButtonUuid, {offsets: [...selectedPods, ...[pod]]})
      }
      else {
        updateDmxButton(selectedDmxButtonUuid, {offsets: selectedPods.filter(offset => offset !=pod)})
      }
    }

    const setDmx = (data: any) => {
      if(readyState == ReadyState.OPEN) {
        sendJsonMessage(data)
      }
      else {
        setDmxHexSignal(data.dmxHexSignal)
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
        const mainLoopInterval = setInterval(() => {
          let outputDmxHexSignal = dmxHexSignal

          
          dmxButtons.forEach((dmxButton: DmxButton) => {
            outputDmxHexSignal = dmxButton.transformDmxSignal(
              outputDmxHexSignal,
              () => {
                updateDmxButton(dmxButton.uuid, {}, null)
              }
            )
          })
  
          if(outputDmxHexSignal != dmxHexSignal) {
            setDmx({
              dmxHexSignal: outputDmxHexSignal
            })
          }
          
        }, TICK_INTERVAL);
  
        return () => clearInterval(mainLoopInterval);
      }, [dmxButtons, setDmx, sendJsonMessage]);

    useEffect(() => {
      if(lastMessage !== null) {
        const jsonMessage = JSON.parse(lastMessage.data)
        if(jsonMessage.channel === 'dmx') {
          const {
            enttecOpenDMXUSB: {
              state: state
            },
            dmxHexSignal: dmxHexSignal
          } = jsonMessage.data
          setEnttecOpenUSBState(state)
          setDmxHexSignal(dmxHexSignal)
        }
        if(jsonMessage.channel === 'control') {
          console.log("CONTROL", jsonMessage)
          if(jsonMessage.action == 'change_program') {
            console.log(programs, jsonMessage.data.program_id)
            setProgram(programs.find((p) => p.id == jsonMessage.data.program_id))
          }
        }
      }
    }, [lastMessage, programs])

    return <div>
      <LedBar dmxHexSignal={dmxHexSignal} size={8} channel={1} selectedPods={selectedPods} onSelectPod={onSelectPod}/>
      <LedBar dmxHexSignal={dmxHexSignal} size={8} channel={25} selectedPods={selectedPods} onSelectPod={onSelectPod}/>
    </div>
}

export default RealTimeConsole
