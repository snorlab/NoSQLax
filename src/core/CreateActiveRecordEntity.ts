import ActiveRecordEntity from "./ActiveRecordEntity";
import DataSource from "./DataSource";

type EntityConfig = {
    fieldMap?: Record<string, string>; // Optional
    methods?: Record<string, Function>; // Optional
    ajvOptions?: any; // Optional
};

type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Dynamically creates an ActiveRecord entity subclass with mandatory type,
 * schemaOrSchemaId, methods (optional), and attaches a dataSource.
 */
export default function createActiveRecordEntity(
    name: string,
    type: string, 
    schemaOrSchemaId: string | object, dataSource: DataSource, config: EntityConfig) {
    const { fieldMap, methods, ajvOptions } = config;

    // Create a dynamic subclass of ActiveRecordEntity
    const EntityClass = class extends ActiveRecordEntity {
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

        /**
         * Allows adding new static methods dynamically at runtime.
         * @param newMethods - An object containing methods to be added.
         */
        static extend(newMethods: Record<string, Function>) {
            Object.assign(this, newMethods);
        }

    };

    // Assign the actual class name to the dynamically created class
    Object.defineProperty(EntityClass, 'name', { value: name });

    // Attach static methods if provided
    if (methods) {
        Object.assign(EntityClass, methods);
    }

    // Automatically attach the dataSource with optional ajvOptions
    EntityClass['attachDataSource'](dataSource, ajvOptions || {});

    return EntityClass as typeof ActiveRecordEntity & { extend: (methods: Record<string, Function>) => void };
}
