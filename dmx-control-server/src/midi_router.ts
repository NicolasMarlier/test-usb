import midi from "midi"
import { EventEmitter } from "events"

export interface MidiMessage {
  device: string
  deltaTime: number
  status: number
  data1: number | undefined
  data2: number | undefined
  raw: number[]
  channel: number
  type: number
}

export const MIDI_MODES = {
    NOTE_OFF: 128,
    NOTE_ON: 144,
    PROGRAM_CHANGE: 192,
    MIDI_CLOCK: 248,
    MIDI_START: 250,
    MIDI_CONTINUE: 251,
    MIDI_STOP: 252,
}

type MidiHandler = (msg: MidiMessage) => void

interface RouterOptions {
  scanDevicesInterval?: number
}

export class MidiRouter extends EventEmitter {
  private scanDevicesInterval: number
  private monitor: midi.Input
  private inputs: Map<string, { input: any; port: number }> = new Map()
  private timer?: NodeJS.Timeout

  constructor(options: RouterOptions = {}) {
    super();
    this.scanDevicesInterval = options.scanDevicesInterval ?? 1000;
    this.monitor = new midi.Input();
  }

  startListenning() {
    this.scanMidiDevices();
    this.timer = setInterval(() => this.scanMidiDevices(), this.scanDevicesInterval);
  }

  stopListenning() {
    if (this.timer) clearInterval(this.timer);

    for (const { input } of this.inputs.values()) {
      input.closePort();
    }
    this.inputs.clear();
  }

  private scanMidiDevices() {
    const portCount = this.monitor.getPortCount();
    const current = new Map<string, number>();

    for (let i = 0; i < portCount; i++) {
      const name: string = this.monitor.getPortName(i);
      current.set(name, i);

      if (!this.inputs.has(name)) {
        this.openPort(name, i);
      }
    }

    for (const name of this.inputs.keys()) {
      if (!current.has(name)) {
        this.closePort(name);
      }
    }
  }

  private openPort(name: string, port: number) {
    const input = new midi.Input();

    console.log("OPEN PORT")
    input.on("message", (deltaTime: number, message: number[]) => {
      const [status, data1, data2] = message;

      if(!status) { return }
      const msg: MidiMessage = {
        device: name,
        deltaTime,
        status,
        data1,
        data2,
        raw: message,
        channel: status & 0x0f,
        type: status & 0xf0,
      };

      this.emit("message", msg)

      if (msg.status === MIDI_MODES.NOTE_ON) {
        this.emit("noteon", msg)
      }

      else if (msg.status === MIDI_MODES.NOTE_OFF) {
        this.emit("noteoff", msg)
      }

      else if (msg.status === MIDI_MODES.PROGRAM_CHANGE) {
        this.emit("programchange", msg)
      }

      else if (msg.status === MIDI_MODES.MIDI_CLOCK) {
        this.emit("clock", msg)
      }

      else if (msg.status === MIDI_MODES.MIDI_START) {
        this.emit("midistart", msg)
      }

      else if (msg.status === MIDI_MODES.MIDI_STOP) {
        this.emit("midistop", msg)
      }

      else {
        console.log("Uncaught message", msg)
      }
    });

    input.openPort(port);
    input.ignoreTypes(false, false, false);

    this.inputs.set(name, { input, port });
    this.emit("connected", name);
  }

  private closePort(name: string) {
    const entry = this.inputs.get(name);
    if (!entry) return;

    entry.input.closePort();
    this.inputs.delete(name);
    this.emit("disconnected", name);
  }

  onMessage(handler: MidiHandler) {
    this.on("message", handler);
  }
}