export const splitPatternsAtTick = (midiPatterns: MidiPattern[], tick: number) => {
    let newPatterns = [] as MidiPattern[]
    midiPatterns.forEach((pattern) => {
        if(
            pattern.ticks < tick
            && (pattern.ticks + pattern.durationTicks) > tick) {
            newPatterns = [...newPatterns, ...[
                {
                    ticks: pattern.ticks,
                    durationTicks: tick - pattern.ticks,
                    midi_notes: pattern.midi_notes.filter((n) => n.ticks < tick)
                },
                {
                    ticks: tick,
                    durationTicks: pattern.ticks + pattern.durationTicks - tick,
                    midi_notes: pattern.midi_notes.filter((n) => n.ticks >= tick)
                }
            ]]
        }
        else {
            newPatterns = [...newPatterns, ...[pattern]]
        }
    })
    return newPatterns
}