"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseEntity_1 = __importDefault(require("./BaseEntity"));
const CreateRepository_1 = __importDefault(require("./CreateRepository"));
class ActiveRecordEntity extends BaseEntity_1.default {
    constructor(data) {
        super(data);
    }
    // Auto-attach DataSource & initialize repo when a child class is defined
    static attachDataSource(dataSource, ajvOptions) {
        if (!this.repoMap.has(this)) {
            this.repoMap.set(this, (0, CreateRepository_1.default)(dataSource, ajvOptions, this));
        }
    }
    // Retrieve the repository for the current entity class
    static getRepo() {
        const repo = this.constructor.repoMap.get(this.constructor);
        if (!repo) {
            throw new Error(`Repository not initialized for ${this.constructor.name}. Make sure a data source is set.`);
        }
        return repo;
    }
    // Static methods
    // 1. Find a document by its ID
    static find(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getRepo().find(id);
        });
    }
    // 2. Find one document using a Mango selector
    findOne(selector_1) {
        return __awaiter(this, arguments, void 0, function* (selector, options = {}) {
            return this.constructor.getRepo().findOne(selector, options);
        });
    }
    // Non static methods
    // 4. Find many documents using a Mango selector
    findMany(selector_1) {
        return __awaiter(this, arguments, void 0, function* (selector, options = {}) {
            return this.constructor.getRepo().findMany(selector, options);
        });
    }
    // 5. Find all documents for the entity type
    findAll() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            return this.constructor.getRepo().findAll(options);
        });
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.constructor.getRepo().save(this);
        });
    }
    // 8. Delete a document
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.id) {
                throw new Error("Document does not exist");
            }
            return this.constructor.getRepo().delete(this.id);
        });
    }
}
ActiveRecordEntity.repoMap = new Map();
exports.default = ActiveRecordEntity;
