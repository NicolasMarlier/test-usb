import './Toggle.scss'

interface Props {
    value: boolean
    onChange: (value: boolean) => void
}

const Toggle = (props: Props) => {
    const { value, onChange } = props
    return <div className={`toggle ${value ? 'active' : ''}`} onClick={() => onChange(!value)}>
            <div className='toggle-pin'/>
        </div>
}
export default Toggle