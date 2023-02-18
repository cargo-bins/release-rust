"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplate = void 0;
function renderTemplate(template, context) {
    const replacements = new Map(Object.entries(context).map(([key, value]) => [`{${key}}`, value]));
    const keys = [...replacements.keys()];
    while (keys.some(key => template.includes(key))) {
        for (const [key, value] of replacements.entries()) {
            template = template.replace(key, value);
        }
    }
    return template;
}
exports.renderTemplate = renderTemplate;
