export const midiNoteEqual = (a: MidiNote, b: MidiNote) => a.midi == b.midi && a.ticks == b.ticks
const includes = (a: MidiNote[], midiNote: MidiNote) => !!a.find(mn => midiNoteEqual(mn, midiNote))
const subtract = (a: MidiNote[], b: MidiNote[]) => a.filter((mn) => !includes(b, mn))
const union = (a: MidiNote[], b: MidiNote[]) => [...subtract(a, b), ...b]
const outer_join = (a: MidiNote[], b: MidiNote[]) => union(subtract(a,b), subtract(b, a))


export const magnettedTick = (tick: number, ppq: number, beatMagnet: number=0.25) => ppq * Math.floor((tick / ppq) / beatMagnet) * beatMagnet

interface InsertNotesAtTickProps {
    tick: number
    midiNotesToInsert: MidiNote[]
    midiNotes: MidiNote[]
    ppq: number
    options?: {
        remove_if_exist?: boolean
    }
}
export const insertNotesAtTick = (props: InsertNotesAtTickProps) => {
    const { midiNotes, midiNotesToInsert, tick, options } = props
    if(midiNotesToInsert.length == 0) return midiNotes
    const initialTick = midiNotesToInsert.reduce((minTick, {ticks}) => Math.min(ticks, minTick), midiNotesToInsert[0].ticks)


    const newMidiNotes = midiNotesToInsert.map(n => ({
        ticks: n.ticks + tick - initialTick,
        midi: n.midi,
        durationTicks: n.durationTicks
    }))

    if(options?.remove_if_exist) {
        return outer_join(midiNotes, newMidiNotes)
    }
    return union(midiNotes, newMidiNotes)
}


type AddNoteAtTickProps = {
    midiKey: MidiKey
    tick: number
    midiNotes: MidiNote[]
    ppq: number
    options?: {
        remove_if_exist?: boolean
    }
}
export const addNoteAtTick = (props: AddNoteAtTickProps) => insertNotesAtTick(
    {
        ...props,
        ...{
            midiNotesToInsert: [{
                ticks: 0,
                durationTicks: props.ppq / 4,
                midi: props.midiKey
            }]
        }
    })

