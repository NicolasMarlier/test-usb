import { Request, Response } from "express"
import { DmxButton } from "../sequelize/models/dmx_button";
import { DmxLoop } from "../dmx_loop";
import { handleErrors, NotFoundError, validateQueryParam, validateUrlParam } from "./application.controller";


const getButton = async(req: Request) => {
  const id = validateUrlParam(req, 'id')
  const button = await DmxButton.findByPk(id);

  if (!button) {
    throw new NotFoundError("DmxButton not found")
  }
  return button
}

export class DmxButtonController {
  static async list(req: Request, res: Response) {
    handleErrors(req, res, async() => {
      const programId = validateQueryParam(req, 'program_id')
      const buttons = await DmxButton.findAll({
        where: {program_id: programId},
        order: [["created_at", "ASC"]],
      })

      res.json(buttons)
    })
  }

  static async get(req: Request, res: Response) {
    handleErrors(req, res, async() => {
      const button = await getButton(req)

      res.json(button);
    })
  }

  static async create(req: Request, res: Response) {
    handleErrors(req, res, async() => {
      const button = await DmxButton.create({
        program_id: req.body.program_id,
        color: req.body.color,
        duration_ms: req.body.duration_ms,
        red_channels: req.body.red_channels ?? [],
        nature: req.body.nature,
        triggering_midi_key: req.body.triggering_midi_key ?? null,
      });

      DmxLoop.getInstance().resyncDmxButtons()
      
      res.status(201).json(button);
    })
  }

  static async play(req: Request, res: Response) {
    handleErrors(req, res, async() => {
      const button = await getButton(req)
      DmxLoop.getInstance().triggerDmxButton(button.id, {mock_midi_signal: true})
      res.json(button);
    })
  }

  static async update(req: Request, res: Response) {
    handleErrors(req, res, async() => {
      const button = await getButton(req)
      await button.update({
        program_id: req.body.program_id ?? button.program_id,
        color: req.body.color ?? button.color,
        duration_ms: req.body.duration_ms ?? button.duration_ms,
        red_channels: req.body.red_channels ?? button.red_channels,
        nature: req.body.nature ?? button.nature,
        triggering_midi_key: req.body.triggering_midi_key ?? button.triggering_midi_key,
      });

      DmxLoop.getInstance().resyncDmxButtons()
      res.json(button)
    })
  }

  static async destroy(req: Request, res: Response) {
    handleErrors(req, res, async() => {
      const button = await getButton(req)
      await button.destroy();
      res.json({ success: true });
    })
  }
}