const { Sequelize } = require('sequelize');

import { DmxButton } from "./models/dmx_button";
import { Program } from "./models/program";


export const initSequelize = () => {
    const sequelize = new Sequelize('postgres://postgres@localhost:5432/dmx_control');

    Program.initModel(sequelize)
    DmxButton.initModel(sequelize)

    Program.hasMany(DmxButton, { foreignKey: 'program_id' })
    DmxButton.belongsTo(Program, { foreignKey: 'program_id' })

    return sequelize;
}
