"use strict";
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createDataMapperEntity;
const DataMapperEntity_1 = __importDefault(require("./DataMapperEntity"));
/**
 * Dynamically creates a DataMapper entity subclass with mandatory type,
 * schemaOrSchemaId, and optional fieldMap.
 */
function createDataMapperEntity(name, type, schemaOrSchemaId, config) {
    var _a;
    const { fieldMap } = config;
    // Create a dynamic subclass of DataMapperEntity
    const EntityClass = (_a = class extends DataMapperEntity_1.default {
            constructor(data) {
                super(data);
                // Dynamically assign fields from fieldMap
                Object.keys(EntityClass.fieldMap).forEach((key) => {
                    const mappedField = key;
                    if (data[mappedField] !== undefined) {
                        this[key] = data[mappedField];
                    }
                });
            }
        },
        __setFunctionName(_a, "EntityClass"),
        _a.type = type,
        _a.schemaOrSchemaId = schemaOrSchemaId // Now mandatory
    ,
        _a.fieldMap = fieldMap || {},
        _a);
    // Assign the actual class name to the dynamically created class
    Object.defineProperty(EntityClass, 'name', { value: name });
    return EntityClass;
}
