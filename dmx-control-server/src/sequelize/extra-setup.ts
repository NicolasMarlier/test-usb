import { Sequelize } from "sequelize";

function applyExtraSetup(sequelize: Sequelize) {
	const { program } = sequelize.models;

	//program.hasMany(button);
	//button.belongsTo(program);
}

module.exports = { applyExtraSetup };