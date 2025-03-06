import DataMapperEntity from "./DataMapperEntity";

type DataMapperEntityConfig = {
    fieldMap?: Record<string, string>; // Optional
};

/**
 * Dynamically creates a DataMapper entity subclass with mandatory type,
 * schemaOrSchemaId, and optional fieldMap.
 */
export default function createDataMapperEntity(
    name: string,
    type: string, 
    schemaOrSchemaId: string | object, 
    config: DataMapperEntityConfig
) {
    const { fieldMap } = config;

    // Create a dynamic subclass of DataMapperEntity
    const EntityClass = class extends DataMapperEntity {
        static type = type;
        static schemaOrSchemaId = schemaOrSchemaId; // Now mandatory
        static fieldMap = fieldMap || {};

        constructor(data: Record<string, any>) {
            super(data);

            // Dynamically assign fields from fieldMap
            Object.keys(EntityClass.fieldMap).forEach((key) => {
                const mappedField = key;
                if (data[mappedField] !== undefined) {
                    (this as any)[key] = data[mappedField];
                }
            });
        }
    };

    // Assign the actual class name to the dynamically created class
    Object.defineProperty(EntityClass, 'name', { value: name });

    return EntityClass as typeof DataMapperEntity;
}
