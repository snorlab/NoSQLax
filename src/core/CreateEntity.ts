import ActiveRecordEntity from "./ActiveRecordEntity";
import BaseEntity from "./BaseEntity";
import DataMapperEntity from "./DataMapperEntity";
import DataSource from "./DataSource";
import Ajv, { AnySchema, Options, ValidateFunction, AnySchemaObject } from 'ajv'; // Import Ajv types


type DataMapperEntityConfig = {
  ajvOptions?: any; // Optional
  fieldMap?: Record<string, string>;
};

type EntityConfig = {
  methods?: Record<string, Function>; // Optional
  ajvOptions?: any; // Optional
  fieldMap?: Record<string, string>;
};



function createEntityBase(
  name: string,
  type: string,
  schemaOrSchemaId: string | object,
  config: EntityConfig,
  EntityClass: typeof ActiveRecordEntity | typeof DataMapperEntity
) {
  const { methods, ajvOptions = {}, fieldMap = {} } = config;


  // Dynamically define class
  const DynamicEntityClass = class extends EntityClass {
    static type = type;
    static schemaOrSchemaId = schemaOrSchemaId;
    static fieldMap = config.fieldMap;
    static ajvOptions = config.ajvOptions;

    constructor(data: Record<string, any>) {
      super(data);
    }

  };


  // Attach custom static methods
  if (methods) {
    Object.assign(DynamicEntityClass, methods);
  }

  Object.defineProperty(DynamicEntityClass, 'name', { value: name });

  return DynamicEntityClass as unknown;
}

export function createActiveRecordEntity(
  name: string,
  type: string,
  schemaOrSchemaId: string | object,
  dataSource: DataSource,
  config: EntityConfig
) {
  // Explicitly type the EntityClass as typeof ActiveRecordEntity
  let EntityClass = createEntityBase(name, type, schemaOrSchemaId, config, ActiveRecordEntity) as typeof ActiveRecordEntity;

  // Automatically attach the dataSource with optional ajvOptions
  EntityClass['attachDataSource'](dataSource, config.ajvOptions || {});

  return EntityClass as typeof ActiveRecordEntity;
}



export function createDataMapperEntity(
  name: string,
  type: string,
  schemaOrSchemaId: string | object,
  config: DataMapperEntityConfig
) {
  // Use the shared base function for creating the class
  const EntityClass = createEntityBase(name, type, schemaOrSchemaId, config, DataMapperEntity) as typeof DataMapperEntity;


  return EntityClass as typeof DataMapperEntity;
}
