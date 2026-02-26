'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("dmx_buttons", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },

      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "programs",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      color: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      duration_ms: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      offsets: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },

      nature: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      signal: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("dmx_buttons");
  }
};
