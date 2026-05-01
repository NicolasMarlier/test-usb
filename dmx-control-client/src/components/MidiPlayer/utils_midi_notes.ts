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



interface InsertPatternsAtTickProps {
    tick: number
    midiPatternsToInsert: MidiPattern[]
    midiPatterns: MidiPattern[]
    ppq: number
}
export const insertPatternsAtTick = (props: InsertPatternsAtTickProps) => {
    const { midiPatterns, midiPatternsToInsert, tick } = props
    if(midiPatternsToInsert.length == 0) return midiPatterns
    const initialTick = midiPatternsToInsert.reduce((minTick, {ticks}) => Math.min(ticks, minTick), midiPatternsToInsert[0].ticks)


    const newMidiPatterns = midiPatternsToInsert.map(p => ({
        ticks: p.ticks + tick - initialTick,
        durationTicks: p.durationTicks,
        midi_notes: p.midi_notes.map(n => ({
            ticks: n.ticks + tick - initialTick,
            durationTicks: n.durationTicks,
            midi: n.midi
        }))
    }))

    
    return [...midiPatterns, ...newMidiPatterns].toSorted((a, b) => a.ticks - b.ticks)
}