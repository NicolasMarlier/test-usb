import { WebSocketServer, WebSocket } from 'ws';
import { EnttecOpenDMXUSB } from './enttec_open_dmx_usb';
import { MidiRouter } from './midi_router';
import { DmxButtonController } from './controllers/dmx_buttons.controller';
import { ProgramsController } from './controllers/programs.controller';
import { DmxMidiController } from './controllers/dmx_midi.controller';
import { ProgramsAudioController, audioUpload } from './controllers/programs_audio.controller';
import { DMX_LOOP_EVENTS, DmxLoop } from './dmx_loop';
import { initSequelize } from './sequelize/init_sequelize';


// Init Sequelize
initSequelize()

// HTTP Server
const express = require('express')
var cors = require('cors')

const app = express()
app.use(express.json());
app.use(cors())
const HTTP_PORT = 3000

app.get('/programs', ProgramsController.list)
app.post('/programs', ProgramsController.create)
app.put('/programs/:id', ProgramsController.update)
app.delete('/programs/:id', ProgramsController.destroy)

app.post("/programs/:id/audio", audioUpload.single("file"), ProgramsAudioController.upload)
app.delete("/programs/:id/audio", ProgramsAudioController.reset)
app.get("/programs/:id/audio", ProgramsAudioController.getAudio)

app.get("/programs/:program_id/dmx_midi", DmxMidiController.get)
app.put("/programs/:program_id/dmx_midi", DmxMidiController.update)

app.get("/dmx_buttons/", DmxButtonController.list);
app.post("/dmx_buttons", DmxButtonController.create);
app.get("/dmx_buttons/:id", DmxButtonController.get);
app.post("/dmx_buttons/:id/play", DmxButtonController.play);
app.put("/dmx_buttons/:id", DmxButtonController.update);
app.delete("/dmx_buttons/:id", DmxButtonController.destroy);



app.listen(HTTP_PORT, () => {
  console.log(`HTTP Server listening on port ${HTTP_PORT}`)
})



// Midi Router
console.log("Openning Midi Router")
const midi_router = new MidiRouter() 
midi_router.on('programchange', (e) => {
  const programId = e.data1 + 1
  DmxLoop.getInstance().switchProgram(programId)
})
midi_router.on('noteon', (e) => {
  const midiKey = e.data1
  const data: WSMidiNoteOnMessage = {
    midi: midiKey
  }
  DmxLoop.getInstance().triggerDmxButtonsByMidiKey(midiKey)
  wsSendToAll(JSON.stringify({
      channel: 'midi_input',
      action: 'note_on',
      data
  }))
})
midi_router.on('clock', () => {
  DmxLoop.getInstance().dmxMidiHandler.receiveClock()
})
midi_router.on('midistart', () => DmxLoop.getInstance().dmxMidiHandler.play())
midi_router.on('midistop', () => {
  DmxLoop.getInstance().dmxMidiHandler.stop()
})
midi_router.startListenning()
console.log("Opened")


// DMXInterface
const enttec = new EnttecOpenDMXUSB()


// WS Server
const wss = new WebSocketServer({
  port: 8080
});
const ws_clients = new Set<WebSocket>();

const sendStatusToAll = () => {
  ws_clients.forEach(ws => sendStatus(ws))
}

const sendStatus = (ws: WebSocket) => {
  ws_clients.forEach(ws => ws.send(JSON.stringify({
    channel: 'dmx',
    data: {
      enttecOpenDMXUSB: {
        state: enttec.state()
      },
      dmxHexSignal: enttec.dmxHexString,
      midiCurrentTick: DmxLoop.getInstance().dmxMidiHandler.currentTick
    }
  })))
}

const wsSendToAll = (message: string) => {
  ws_clients.forEach(ws => ws.send(message))
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const {dmxHexSignal: dmxHexSignal} = JSON.parse(data.toString())
    enttec.setDmxHex(dmxHexSignal)
  });

  enttec.updateDispatch = () => {
    sendStatus(ws)
  }

  sendStatus(ws)

  ws_clients.add(ws);

  ws.on("close", () => {
    ws_clients.delete(ws);
  });
});

console.log("WS Server ready on port 8080")


//DmxLoop
DmxLoop.getInstance().on(DMX_LOOP_EVENTS.TICK, (dmx_hex_signal) => {
  enttec.setDmxHex(dmx_hex_signal)
  sendStatusToAll()
});

DmxLoop.getInstance().on(DMX_LOOP_EVENTS.PROGRAM_CHANGE, (program_id: number) => {
  wsSendToAll(JSON.stringify({
      channel: 'control',
      action: 'change_program',
      data: {program_id}
  }))
  DmxLoop.getInstance().dmxMidiHandler.stop({reset: true})
});

DmxLoop.getInstance().on(DMX_LOOP_EVENTS.MOCK_MIDI_INPUT, (midi_note_midi: MidiKey) => {
  const data: WSMidiNoteOnMessage = {
    midi: midi_note_midi
  }
  wsSendToAll(JSON.stringify({
      channel: 'midi_input',
      action: 'note_on',
      data
  }))
})

DmxLoop.getInstance().start()



    