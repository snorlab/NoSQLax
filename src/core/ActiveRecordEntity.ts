import BaseEntity from "./BaseEntity";
import CouchRepository from "./CouchRepository";
import DataSource from "./DataSource";
import createRepository from "./CreateRepository"
import { MangoQuery, MangoSelector } from "nano";
type MangoOptions = Omit<MangoQuery, 'selector'>;
import Nano, { DocumentScope  } from "nano";


abstract class ActiveRecordEntity extends BaseEntity {

    private static repoMap: Map<typeof ActiveRecordEntity, CouchRepository> = new Map();

    constructor(data: { _id?: string; _rev?: string;[key: string]: any }) {
        super(data);
    }

    // Auto-attach DataSource & initialize repo when a child class is defined
    protected static attachDataSource(dataSource: DataSource, ajvOptions: any) {
        if (!this.repoMap.has(this)) {
            this.repoMap.set(this, createRepository(this as any, dataSource, {ajvOptions} ));
        }
    }

    // Retrieve the repository for the current entity class
    private static getRepo(): CouchRepository {
        const repo = (this as typeof ActiveRecordEntity).repoMap.get(this as typeof ActiveRecordEntity);
        if (!repo) {
            throw new Error(`Repository not initialized for ${this.constructor.name}. Make sure a data source is set.`);
        }
        return repo;
    }

    // Static methods
    // 1. Find a document by its ID
    static async find(id: string): Promise<BaseEntity> {
        return await this.getRepo().find(id);
    }

    // 2. Find one document using a Mango selector
    static async findOne(selector: MangoSelector, options: MangoOptions = {}): Promise<BaseEntity> {
        return await this.getRepo().findOne(selector, options)
    }

    static get dataSource(): DataSource {
        return this.getRepo().dataSource;
    }


    // Non static methods
    // 4. Find many documents using a Mango selector
    static async findMany(selector: MangoSelector, options: MangoOptions = {}): Promise<BaseEntity[]> {
        return await this.getRepo().findMany(selector, options)
    }

    // 5. Find all documents for the entity type
    static async findAll(options: MangoOptions = {}): Promise<BaseEntity[]> {
        return await this.getRepo().findAll(options)
    }

    static async save(data: BaseEntity): Promise<BaseEntity> {
        return await this.getRepo().save(data)
    }

    async save(): Promise<BaseEntity> {
        return await (this.constructor as typeof ActiveRecordEntity).save(this)
    }

    // 8. Delete a document
    static async delete(id: string): Promise<{ message: string }> {
        return this.getRepo().delete(id);
    }

    async delete(): Promise<{ message: string }> {
        if (!this.id) {
            throw new Error("Document does not exist");
        }
        return await (this.constructor as typeof ActiveRecordEntity).delete(this.id);
    }

    // Define the extend method to add new query methods
    static extend(newMethods: Record<string, Function>) {
        Object.assign(this, newMethods);
    }


}

export default ActiveRecordEntity;