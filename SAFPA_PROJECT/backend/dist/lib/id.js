"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
function generateId(prefix) {
    const randomPart = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
    return `${prefix}${Date.now()}${randomPart}`;
}
//# sourceMappingURL=id.js.map