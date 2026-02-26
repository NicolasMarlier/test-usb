import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, Sequelize } from 'sequelize';

export class Program extends Model<InferAttributes<Program>, InferCreationAttributes<Program>> {
  declare id: CreationOptional<number>;
  declare name: string;

  static initModel(sequelize: Sequelize): typeof Program {
    Program.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: new DataTypes.STRING(128),
          allowNull: false,
        }
      },
      {
        tableName: 'programs',
        sequelize,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    )

    return Program
  }
}