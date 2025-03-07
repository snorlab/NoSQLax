import BaseEntity from "./BaseEntity";
import DataSource from "./DataSource";
import CouchRepository from "./CouchRepository";

type RepoConfig = {
    methods?: Record<string, Function>; // Optional
    ajvOptions?: any; // Optional
};

// Type for the entity class constructor
type EntityClass = {
    fieldMap: Record<string, string>;
    new(data: Record<string, any>): BaseEntity;
    schemaOrSchemaId: string | object;
    type: string;
    [key: string]: any;
};

export default function createRepository(
    entityClass: EntityClass,
    ds: DataSource,
    config: RepoConfig,
): CouchRepository {
    // Create the dynamic repository class
    const DynamicRepoClass = class extends CouchRepository {
        constructor() {
            super(ds, config?.ajvOptions, entityClass);
        }
    };

    // Attach static methods if provided
    if (config.methods) {
        Object.assign(DynamicRepoClass, config.methods);
    }

    return new DynamicRepoClass();
}