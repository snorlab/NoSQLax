import BaseEntity from "./BaseEntity";
import CouchRepository from "./CouchRepository";
import DataSource from "./DataSource";
import createRepository from "./CreateRepository"
import { MangoQuery, MangoSelector } from "nano";
type MangoOptions = Omit<MangoQuery, 'selector'>;


abstract class ActiveRecordEntity extends BaseEntity {

    private static repoMap: Map<typeof ActiveRecordEntity, CouchRepository> = new Map();

    constructor(data: { _id?: string; _rev?: string;[key: string]: any }) {
        super(data);
    }

    // Auto-attach DataSource & initialize repo when a child class is defined
    protected static attachDataSource(dataSource: DataSource, ajvOptions: any) {
        if (!this.repoMap.has(this)) {
            this.repoMap.set(this, createRepository(dataSource, ajvOptions, this as any));
        }
    }

    // Retrieve the repository for the current entity class
    private static getRepo(): CouchRepository {
        const repo = (this.constructor as typeof ActiveRecordEntity).repoMap.get(this.constructor as typeof ActiveRecordEntity);
        if (!repo) {
            throw new Error(`Repository not initialized for ${this.constructor.name}. Make sure a data source is set.`);
        }
        return repo;
    }

    // Static methods
    // 1. Find a document by its ID
    static async find(id: string): Promise<BaseEntity> {
        return this.getRepo().find(id);
    }

    // 2. Find one document using a Mango selector
    async findOne(selector: MangoSelector, options: MangoOptions = {}): Promise<BaseEntity> {
        return (this.constructor as typeof ActiveRecordEntity).getRepo().findOne(selector, options)
    }


    // Non static methods
    // 4. Find many documents using a Mango selector
    async findMany(selector: MangoSelector, options: MangoOptions = {}): Promise<BaseEntity[]> {
        return (this.constructor as typeof ActiveRecordEntity).getRepo().findMany(selector, options)
    }

    // 5. Find all documents for the entity type
    async findAll(options: MangoOptions = {}): Promise<BaseEntity[]> {
        return (this.constructor as typeof ActiveRecordEntity).getRepo().findAll(options)
    }


    async save(): Promise<BaseEntity> {
        return (this.constructor as typeof ActiveRecordEntity).getRepo().save(this)
    }

    // 8. Delete a document
    async delete(): Promise<{ message: string }> {
        if (!this.id) {
            throw new Error("Document does not exist");
        }
        return (this.constructor as typeof ActiveRecordEntity).getRepo().delete(this.id);
    }

}

export default ActiveRecordEntity;