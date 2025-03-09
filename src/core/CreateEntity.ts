import ActiveRecordEntity from "./ActiveRecordEntity";
import BaseEntity from "./BaseEntity";
import DataMapperEntity from "./DataMapperEntity";
import DataSource from "./DataSource";
import Ajv, { } from 'ajv'; // Import Ajv types


type DataMapperEntityConfig = {
    ajvOptions?: any; // Optional
    fieldMap?: Record<string, string>;
};

type EntityConfig = {
    methods?: Record<string, Function>; // Optional
    ajvOptions?: any; // Optional
    fieldMap?: Record<string, string>;
};

type Constructor<T = {}> = new (...args: any[]) => T;

function createEntityBase(
    name: string,
    type: string,
    schemaOrSchemaId: string | object,
    config: EntityConfig,
    EntityClass: typeof ActiveRecordEntity | typeof DataMapperEntity
) {
    const { methods, ajvOptions, fieldMap = {} } = config;

    // Merge user-provided fieldMap with the one extracted from the schema
    const mergedFieldMap = {
        ...EntityClass.extractFieldMapFromSchema(schemaOrSchemaId, ajvOptions),
        ...{ type: fieldMap ? fieldMap.type : "type" }
    };

    

    // Create a dynamic subclass of the selected entity class
    const DynamicEntityClass = class extends EntityClass {
        static type = type;
        static schemaOrSchemaId = schemaOrSchemaId;
        static fieldMap = mergedFieldMap;

        [key: string]: any; // This allows dynamic fields to be assigned to the instance


    };


    // Assign the actual class name to the dynamically created class
    Object.defineProperty(DynamicEntityClass, 'name', { value: name });

    

    // Attach static methods if provided
    if (methods) {
        Object.assign(DynamicEntityClass, methods);
    }

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
