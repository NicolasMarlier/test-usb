import { Request, Response } from "express";
const { models } = require('./sequelize');

export class DmxButtonController {
  // LIST
  static async list(req: Request, res: Response) {
    try {
      const { program_id } = req.query;

      const where = program_id ? { program_id } : undefined;

      const buttons = await models.findAll({
        where,
        order: [["created_at", "ASC"]],
      });

      res.json(buttons);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch DMX buttons" });
    }
  }

  // GET ONE
  static async get(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const button = await models.DmxButton.findByPk(id);

      if (!button) {
        return res.status(404).json({ error: "DmxButton not found" });
      }

      res.json(button);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch DmxButton" });
    }
  }

  // CREATE
  static async create(req: Request, res: Response) {
    try {
      const button = await models.DmxButton.create({
        program_id: req.body.program_id,
        color: req.body.color,
        duration_ms: req.body.duration_ms,
        offsets: req.body.offsets ?? [],
        nature: req.body.nature,
        signal: req.body.signal ?? null,
      });

      res.status(201).json(button);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Failed to create DmxButton" });
    }
  }

  // UPDATE
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const button = await models.DmxButton.findByPk(id);

      if (!button) {
        return res.status(404).json({ error: "DmxButton not found" });
      }

      await button.update({
        program_id: req.body.program_id ?? button.program_id,
        color: req.body.color ?? button.color,
        duration_ms: req.body.duration_ms ?? button.duration_ms,
        offsets: req.body.offsets ?? button.offsets,
        nature: req.body.nature ?? button.nature,
        signal: req.body.signal ?? button.signal,
      });

      res.json(button);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Failed to update DmxButton" });
    }
  }

  // DELETE
  static async destroy(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const button = await models.DmxButton.findByPk(id);

      if (!button) {
        return res.status(404).json({ error: "DmxButton not found" });
      }

      await button.destroy();

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete DmxButton" });
    }
  }
}