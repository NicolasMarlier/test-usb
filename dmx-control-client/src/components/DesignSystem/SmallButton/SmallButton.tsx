import type { ReactNode } from 'react'
import './SmallButton.scss'

interface Props {
    value?: boolean
    onClick?: () => void
    disabled?: boolean
    children: ReactNode
}

const SmallButton = (props: Props) => {
    const { value, onClick, children, disabled } = props
    return <div
                className={`small-button ${value ? 'active' : ''} ${disabled ? 'disabled' : 'enabled'}`}
                onClick={!disabled && onClick || (() => {})}>
            <div className='small-button-pin'>
                { children }
            </div>
        </div>
}
export default SmallButton