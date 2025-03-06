import ActiveRecordEntity from "./ActiveRecordEntity";
import DataSource from "./DataSource";
type EntityConfig = {
    fieldMap?: Record<string, string>;
    methods?: Record<string, Function>;
    ajvOptions?: any;
};
/**
 * Dynamically creates an ActiveRecord entity subclass with mandatory type,
 * schemaOrSchemaId, methods (optional), and attaches a dataSource.
 */
export default function createActiveRecordEntity(name: string, type: string, schemaOrSchemaId: string | object, dataSource: DataSource, config: EntityConfig): typeof ActiveRecordEntity & {
    extend: (methods: Record<string, Function>) => void;
};
export {};
