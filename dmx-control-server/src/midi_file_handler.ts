import { Midi } from "@tonejs/midi";
import fs from "fs"
import path from "path"

export interface NoteEvent {
  tick: number;
  durationTicks: number;
  midi: number;
  velocity: number;
  channel: number;
  track: number;
}

export class MidiFileHandler {
  private midi: Midi;
  private notesByTick: Map<number, NoteEvent[]> = new Map();
  public filePath: string;

  constructor(filePath: string, data: Buffer) {
    this.filePath = filePath;
    this.midi = new Midi(data);
    this.indexNotes();
  }

  static fromFile(filename: string): MidiFileHandler {
    const data = fs.readFileSync(filename);
    return new MidiFileHandler(filename, data);
  }


  private indexNotes() {
    this.midi.tracks.forEach((track, trackIndex) => {
      track.notes.forEach((note) => {
        const event: NoteEvent = {
          tick: note.ticks,
          durationTicks: note.durationTicks,
          midi: note.midi,
          velocity: note.velocity,
          channel: track.channel ?? 0,
          track: trackIndex,
        };

        if (!this.notesByTick.has(note.ticks)) {
          this.notesByTick.set(note.ticks, []);
        }

        this.notesByTick.get(note.ticks)!.push(event);
      });
    });
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

  /**
   * Get notes starting exactly at this tick
   */
  getNotesAtTick(tick: number): NoteEvent[] {
    return this.notesByTick.get(tick) ?? [];
  }

  /**
   * Get notes active at this tick (notes currently playing)
   */
  getActiveNotesAtTick(tick: number): NoteEvent[] {
    const result: NoteEvent[] = [];

    for (const notes of this.notesByTick.values()) {
      for (const note of notes) {
        const start = note.tick;
        const end = note.tick + note.durationTicks;

        if (tick >= start && tick < end) {
          result.push(note);
        }
      }
    }

    return result;
  }

  /**
   * Useful for sequencers
   */
  getAllTicks(): number[] {
    return Array.from(this.notesByTick.keys()).sort((a, b) => a - b);
  }

  getPPQ(): number {
    return this.midi.header.ppq;
  }

  getTempo(): number {
    const tempo = this.midi.header.tempos[0];
    return tempo?.bpm ?? 120;
  }
}