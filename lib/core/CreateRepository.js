"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createRepository;
const CouchRepository_1 = __importDefault(require("./CouchRepository"));
function createRepository(ds, ajvOptions, entityClass) {
    return new (class extends CouchRepository_1.default {
    })(ds, ajvOptions, entityClass);
}
