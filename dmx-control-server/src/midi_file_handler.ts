import { Midi } from "@tonejs/midi";
import fs from "fs"
import path from "path"
import { EventEmitter } from "events";

export interface NoteEvent {
  tick: number;
  durationTicks: number;
  midi: number;
  velocity: number;
  channel: number;
  track: number;
}

// 24 PPQM per clock event
// https://en.wikipedia.org/wiki/MIDI_beat_clock
const CLOCK_PPQM = 24


export class MidiFileHandler extends EventEmitter {
  public filePath: string;
  private midi: Midi;
  private isPlaying: boolean
  currentTick: number
  midiNotes: any[]

  constructor(filePath: string, data: Buffer) {
    super()
    console.log("NEW")
    this.filePath = filePath;
    this.midi = new Midi(data);
    this.isPlaying = false
    this.currentTick = 0
    this.midiNotes = []
    this.indexNotes();
  }

  static fromFile(filename: string): MidiFileHandler {
    const data = fs.readFileSync(filename);
    return new MidiFileHandler(filename, data);
  }


  private indexNotes() {
    if(!this.midi) return

    this.midiNotes = this.midi
            .tracks
            .map((track: any) => track.notes)
            .flat()
  }

  static fromUpload(
    buffer: Buffer,
    originalName: string,
    uploadDir = "uploads"
  ): MidiFileHandler {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeName =
      Date.now() +
      "-" +
      originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    const filePath = path.join(uploadDir, safeName);

    fs.writeFileSync(filePath, buffer);

    return new MidiFileHandler(filePath, buffer);
  }


  getPPQ(): number {
    return this.midi.header.ppq;
  }

  getTempo(): number {
    const tempo = this.midi.header.tempos[0];
    return tempo?.bpm ?? 120;
  }

  play = () => {
    console.log('PLAY')
    this.currentTick = -this.midi.header.ppq / CLOCK_PPQM
    this.isPlaying = true
  }

  stop = () => {
    console.log('STOP')
    this.isPlaying = false
  }

  receiveClock = () => {
      if(!this.isPlaying) { return false }
      if(!this.midi) { return false }
    
      this.currentTick = this.currentTick + this.midi.header.ppq / CLOCK_PPQM

      console.log(this.currentTick)

      this.emitCurrentNotes()
  }

  emitCurrentNotes = () => {
      this.midiNotes
          .filter((note: any) => note.ticks >= this.currentTick && note.ticks < this.currentTick + CLOCK_PPQM)
          .map((note: any) => `midi|${note.midi}`)
          .forEach((signal) => this.emit('noteon', signal))
  }
}