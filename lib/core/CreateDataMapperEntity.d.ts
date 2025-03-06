import DataMapperEntity from "./DataMapperEntity";
type DataMapperEntityConfig = {
    fieldMap?: Record<string, string>;
};
/**
 * Dynamically creates a DataMapper entity subclass with mandatory type,
 * schemaOrSchemaId, and optional fieldMap.
 */
export default function createDataMapperEntity(name: string, type: string, schemaOrSchemaId: string | object, config: DataMapperEntityConfig): typeof DataMapperEntity;
export {};
