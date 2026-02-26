import './RgbDot.scss'

interface Props {
    red: number
    green: number
    blue: number,
    selected: boolean
    onSelect: (selected: boolean) => void
}
const RgbDot = (props: Props) => {
    const {red, green, blue, selected, onSelect} = props
    
    return <div
        className={`rgb-dot ${selected ? 'selected' : ''}`}
        onClick={() => onSelect(!selected)}
        style={{background: `rgb(${red}, ${green}, ${blue})`}}/>
}
export default RgbDot