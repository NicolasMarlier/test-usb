import { WebSocketServer, WebSocket } from 'ws';
import { EnttecOpenDMXUSB } from './enttec_open_dmx_usb';
import { Request, Response } from 'express';
import { MidiRouter } from './midi_router';
import { MidiFileHandler } from './midi_file_handler';
import multer from "multer";
import { DmxButtonController } from './controllers/dmx_buttons.controller';
import { ProgramsController } from './controllers/programs.controller';

const express = require('express')
var cors = require('cors')

const app = express()
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.json());
app.use(cors())
const HTTP_PORT = 3000



app.get('/programs', ProgramsController.list)
app.post('/programs', ProgramsController.create)
app.put('/programs/:program_id', ProgramsController.update)
app.delete('/programs/:program_id', ProgramsController.destroy)
app.post("/programs/:program_id/upload-midi", ProgramsController.upload_midi);

app.get("/dmx-buttons/", DmxButtonController.list);
app.get("/dmx-buttons/:id", DmxButtonController.get);
app.post("/dmx-buttons", DmxButtonController.create);
app.put("/dmx-buttons/:id", DmxButtonController.update);
app.delete("/dmx-buttons/:id", DmxButtonController.destroy);



/*app.get('/programs/:program_id/buttons', (req: Request, res: Response) => {
  if((typeof req.params.program_id) !== 'string') {
    return res.status(400).json({error: "Invalid param program_id"})
  }
  const program_id = parseInt(req.params.program_id, 10)
  Button.list({program_id, pool}).then((buttons) => res.json({data: buttons}))
})

app.put('/programs/:program_id/buttons/:button_uuid', (req: Request, res: Response) => {
  if((typeof req.params.program_id) !== 'string') {
    return res.status(400).json({error: "Invalid param program_id"})
  }
  if((typeof req.params.button_uuid) !== 'string') {
    return res.status(400).json({error: "Invalid param program_id"})
  }
  const program_id = parseInt(req.params.program_id, 10)
  const button_uuid = req.params.button_uuid
  const params = req.body
  Button.update({program_id, button_uuid, params, pool}).then(() => res.json({status: 'ok'}))
})*/


const wss = new WebSocketServer({
  port: 8080
});

console.log("Openning Midi Router")
const midi_router = new MidiRouter() 
midi_router.startListenning()
console.log("Openend")


const enttec = new EnttecOpenDMXUSB()

const sendStatus = (ws: WebSocket) => {
  ws.send(JSON.stringify({
    channel: 'dmx',
    data: {
      enttecOpenDMXUSB: {
        state: enttec.state()
      },
      dmxHexSignal: enttec.dmxHexString,
    }
  }))
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const {dmxHexSignal: dmxHexSignal} = JSON.parse(data.toString())
    enttec.setDmxHex(dmxHexSignal)
    sendStatus(ws)
  });

  enttec.updateDispatch = () => {
    sendStatus(ws)
  }

  midi_router.on('programchange', (e) => {
    console.log('programchange', e)

    ws.send(JSON.stringify({
      channel: 'control',
      action: 'change_program',
      data: {
        program_id: e.data1 + 1
      }
    }))
  })

  sendStatus(ws)
});




console.log("WS Server ready on port 8080")
app.listen(HTTP_PORT, () => {
  console.log(`HTTP Server listening on port ${HTTP_PORT}`)
})



