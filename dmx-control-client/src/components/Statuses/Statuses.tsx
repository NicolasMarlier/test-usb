import './Statuses.scss'
import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { DbIcon, UsbIcon } from "../DesignSystem/Icons"

const Statuses = () => {
    const { webSocketReadyState, enttecOpenUSBState } = useRealTimeContext()

    const openUsbColor = {
                    'Not connected': 'gray',
                    'Connected': 'green',
                    'Initializing': 'orange',
                    'Identified': 'orange',
                }[enttecOpenUSBState] || 'gray'
    
    const serverColor = webSocketReadyState == WebSocket.OPEN ? 'green' : 'red' 
    return <>
        <div className={`status-icon ${serverColor}`}>{ DbIcon() }</div>
        <div className={`status-icon ${openUsbColor}`}>{ UsbIcon() }</div>
    </>
}
export default Statuses