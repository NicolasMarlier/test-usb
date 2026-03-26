import {
  Model,
  DataTypes,
  Sequelize,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize"


export class DmxButton extends Model<InferAttributes<DmxButton>, InferCreationAttributes<DmxButton>> {
  declare id: CreationOptional<string>
  declare program_id: number
  declare color: string
  declare duration_ms: number
  declare offsets: number[]
  declare nature: 'Set' | 'Boom' | 'Run'
  declare signal: string | null

  static initModel(sequelize: Sequelize): typeof DmxButton {
    DmxButton.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },

        program_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },

        color: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "#ffffff",
        },

        duration_ms: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 500,
        },

        offsets: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [1, 5, 7],
        },

        nature: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'Set'
        },

        signal: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "dmx_buttons",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      }
    );

    return DmxButton;
  }
}

