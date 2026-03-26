import { WebSocketServer, WebSocket } from 'ws';
import { EnttecOpenDMXUSB } from './enttec_open_dmx_usb';
import { MidiRouter } from './midi_router';
import multer from "multer";
import { DmxButtonController } from './controllers/dmx_buttons.controller';
import { ProgramsController } from './controllers/programs.controller';
import { DMX_LOOP_EVENTS, DmxLoop } from './dmx_loop';
import { initSequelize } from './sequelize/init_sequelize';


// Init Sequelize
initSequelize()

// HTTP Server
const express = require('express')
var cors = require('cors')

const app = express()
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.json());
app.use(cors())
const HTTP_PORT = 3000

app.get('/programs', ProgramsController.list)
app.post('/programs', ProgramsController.create)
app.put('/programs/:id', ProgramsController.update)
app.delete('/programs/:id', ProgramsController.destroy)

app.get("/programs/:id/midi", ProgramsController.get_midi)
app.put("/programs/:id/midi", upload.single("file"), ProgramsController.upload_midi)
app.delete("/programs/:id/midi", ProgramsController.reset_midi)


app.get("/dmx_buttons/", DmxButtonController.list);
app.get("/dmx_buttons/:id", DmxButtonController.get);
app.post("/dmx_buttons", DmxButtonController.create);
app.post("/dmx_buttons/:id/play", DmxButtonController.play);
app.put("/dmx_buttons/:id", DmxButtonController.update);
app.delete("/dmx_buttons/:id", DmxButtonController.destroy);

app.listen(HTTP_PORT, () => {
  console.log(`HTTP Server listening on port ${HTTP_PORT}`)
})



// Midi Router
console.log("Openning Midi Router")
const midi_router = new MidiRouter() 
midi_router.on('programchange', (e) => DmxLoop.getInstance().switchProgram(e.data1 + 1))
midi_router.on('noteon', (e) => {
  DmxLoop.getInstance().triggerDmxButtonMatchingSignal(e)
  wsSendToAll(JSON.stringify({
      channel: 'midi_input',
      action: 'note_on',
      data: e
  }))
})
midi_router.on('clock', () => DmxLoop.getInstance().midiFileHandler?.receiveClock())
midi_router.on('midistart', () => DmxLoop.getInstance().midiFileHandler?.play())
midi_router.on('midistop', () => DmxLoop.getInstance().midiFileHandler?.stop())
midi_router.startListenning()
console.log("Openend")


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
      midiCurrentTick: DmxLoop.getInstance().midiFileHandler?.currentTick
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
});

DmxLoop.getInstance().start()



    