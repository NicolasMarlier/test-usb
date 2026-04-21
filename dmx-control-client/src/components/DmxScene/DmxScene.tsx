import LedBar from "./LedBar";
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext";
import { useRealTimeContext } from "../../contexts/RealTimeContext";


const DmxScene = () => {
    const { dmxButtons, selectedDmxButtonId } = useDmxButtonsContext()
    const { dmxHexSignal } = useRealTimeContext()

    const { updateDmxButtonAndSync } = useDmxButtonsContext()

    const selectedRedChannels = dmxButtons.find(({id}) => selectedDmxButtonId == id)?.red_channels || []

    const onSelectRedChannels = (redChannels: number[], selected: boolean) => {
      if(!selectedDmxButtonId) return

      if(selected) {
        updateDmxButtonAndSync(selectedDmxButtonId, {red_channels: [...new Set([...selectedRedChannels, ...redChannels])]})
      }
      else {
        updateDmxButtonAndSync(selectedDmxButtonId, {red_channels: selectedRedChannels.filter(channel => redChannels.indexOf(channel) == -1)})
      }
    }

    return <div>
      <LedBar dmxHexSignal={dmxHexSignal} size={8} channel={1} selectedRedChannels={selectedRedChannels} onSelectRedChannels={onSelectRedChannels}/>
      <LedBar dmxHexSignal={dmxHexSignal} size={8} channel={25} selectedRedChannels={selectedRedChannels} onSelectRedChannels={onSelectRedChannels}/>
      <LedBar dmxHexSignal={dmxHexSignal} size={1} channel={49} selectedRedChannels={selectedRedChannels} onSelectRedChannels={onSelectRedChannels}/>
    </div>
}

export default DmxScene
