"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nano_1 = __importDefault(require("nano"));
class DataSource {
    constructor(config) {
        const { url, username, password, database } = config;
        // Construct authentication URL if credentials are provided
        const authUrl = username && password
            ? `${url.replace('://', `://${username}:${password}@`)}`
            : url;
        // Create direct database connection
        const server = (0, nano_1.default)(authUrl);
        this._connection = server.use(database);
    }
    /**
     * Get the database connection
     */
    get connection() {
        return this._connection;
    }
}
exports.default = DataSource;
