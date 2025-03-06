"use strict";
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createActiveRecordEntity;
const ActiveRecordEntity_1 = __importDefault(require("./ActiveRecordEntity"));
/**
 * Dynamically creates an ActiveRecord entity subclass with mandatory type,
 * schemaOrSchemaId, methods (optional), and attaches a dataSource.
 */
function createActiveRecordEntity(name, type, schemaOrSchemaId, dataSource, config) {
    var _a;
    const { fieldMap, methods, ajvOptions } = config;
    // Create a dynamic subclass of ActiveRecordEntity
    const EntityClass = (_a = class extends ActiveRecordEntity_1.default {
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
            /**
             * Allows adding new static methods dynamically at runtime.
             * @param newMethods - An object containing methods to be added.
             */
            static extend(newMethods) {
                Object.assign(this, newMethods);
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
    // Attach static methods if provided
    if (methods) {
        Object.assign(EntityClass, methods);
    }
    // Automatically attach the dataSource with optional ajvOptions
    EntityClass['attachDataSource'](dataSource, ajvOptions || {});
    return EntityClass;
}
