import './ProgramInput.scss'
import { useEffect, useState } from "react"

interface Props {
    program: Program,
    selected: boolean,
    onSelect: () => void,
    onUpdate: (newProgram: Program) => void
    onDelete: () => void
}
const ProgramInput = (props: Props) => {
    const { program, selected, onSelect, onUpdate, onDelete } = props

    const [name, setName] = useState(program.name)
    const [id, setId] = useState(program.id)

    useEffect(() => {
        setName(program.name)
        setId(program.id)
    }, [program])

    return <div
        className={`program-item ${selected ? 'selected' : ''}`}
        onClick={onSelect}>
        <input value={name} onChange={(e) => setName(e.target.value)}/>
        <input value={id} type="number" onChange={(e) => setId(parseInt(e.target.value, 10))}/>
        <div onClick={() => onUpdate({name, id})}>Save</div>
        <div onClick={() => onDelete()}>Delete</div>
    </div>
}
export default ProgramInput