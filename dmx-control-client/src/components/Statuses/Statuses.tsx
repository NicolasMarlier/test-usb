import { useRealTimeContext } from "../../contexts/RealTimeContext"
import LabelledStatus from "./LabelledStatus"

const Statuses = () => {
    const { webSocketReadyState, enttecOpenUSBState } = useRealTimeContext()

    return <>
        <LabelledStatus
            label='Server'
            status={webSocketReadyState == WebSocket.OPEN ? 'Green' : 'Red' }/>
        <LabelledStatus
            label='Enttec OpenUSB'
            status={
                ({
                    'Not connected': 'Red',
                    'Connected': 'Green',
                    'Initializing': 'Orange',
                    'Identified': 'Orange',
                }[enttecOpenUSBState] || 'Red') as ('Green' | 'Orange' | 'Red')}/>
    </>
}
export default Statuses