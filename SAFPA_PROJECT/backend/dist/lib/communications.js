"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchCommunication = dispatchCommunication;
exports.getTriggerLabel = getTriggerLabel;
exports.getCommunicationTemplateVariables = getCommunicationTemplateVariables;
const id_1 = require("./id");
const triggerLabels = {
    payment_reminder: 'Payment Reminder',
    payment_receipt: 'Payment Receipt',
    payment_failed_notice: 'Payment Failed Notice',
    policy_activated: 'Policy Activated',
    policy_suspended: 'Policy Suspended',
    policy_lapsed: 'Policy Lapsed',
    policy_reinstated: 'Policy Reinstated',
    policy_cancelled: 'Policy Cancelled',
    funeral_case_update: 'Funeral Case Update',
    welcome: 'Welcome Message',
    custom: 'Custom Message',
};
function formatDateTime(value) {
    return value.toISOString().slice(0, 16).replace('T', ' ');
}
function addMinutes(value, minutes) {
    return new Date(value.getTime() + minutes * 60000);
}
function normalizeSmsRecipient(contact) {
    return contact.replace(/[^\d+]/g, '');
}
function determineDemoLifecycle(type, recipientContact) {
    const queuedAt = new Date();
    const sentAt = addMinutes(queuedAt, 1);
    const normalizedContact = recipientContact.trim();
    if (!normalizedContact) {
        return {
            status: 'failed',
            queuedAt: formatDateTime(queuedAt),
            sentAt: formatDateTime(sentAt),
            failedAt: formatDateTime(addMinutes(queuedAt, 2)),
            statusReason: 'Recipient contact is missing',
        };
    }
    if (type === 'sms') {
        const digits = normalizeSmsRecipient(normalizedContact).replace(/^\+/, '');
        if (digits.length < 10) {
            return {
                status: 'failed',
                queuedAt: formatDateTime(queuedAt),
                sentAt: formatDateTime(sentAt),
                failedAt: formatDateTime(addMinutes(queuedAt, 2)),
                statusReason: 'Recipient phone number is invalid for demo SMS dispatch',
            };
        }
    }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContact)) {
        return {
            status: 'failed',
            queuedAt: formatDateTime(queuedAt),
            sentAt: formatDateTime(sentAt),
            failedAt: formatDateTime(addMinutes(queuedAt, 2)),
            statusReason: 'Recipient email address is invalid for demo email dispatch',
        };
    }
    return {
        status: 'delivered',
        queuedAt: formatDateTime(queuedAt),
        sentAt: formatDateTime(sentAt),
        deliveredAt: formatDateTime(addMinutes(queuedAt, 2)),
        statusReason: 'Simulated delivery completed successfully',
    };
}
function stringifyValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}
function renderTemplate(template, variables) {
    if (!template) {
        return template;
    }
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, variableName) => stringifyValue(variables?.[variableName]));
}
async function resolveTemplate(db, parlourId, type, trigger, templateId) {
    if (templateId) {
        const exact = await db.communicationTemplate.findFirst({
            where: {
                id: templateId,
                parlourId,
                isActive: true,
            },
        });
        if (exact) {
            return exact;
        }
    }
    return db.communicationTemplate.findFirst({
        where: {
            parlourId,
            type,
            trigger,
            isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
    });
}
async function dispatchCommunication(db, input) {
    const template = await resolveTemplate(db, input.parlourId, input.type, input.trigger, input.templateId);
    const renderedSubject = renderTemplate(input.subject ?? template?.subject ?? undefined, input.variables);
    const renderedBody = renderTemplate(input.body ?? template?.body ?? '', input.variables) || '';
    const lifecycle = determineDemoLifecycle(input.type, input.recipientContact);
    const providerMessageId = `demo-${(0, id_1.generateId)('msg')}`;
    const templateName = input.templateName ?? template?.name ?? triggerLabels[input.trigger];
    return db.communicationLog.create({
        data: {
            id: (0, id_1.generateId)('c'),
            parlourId: input.parlourId,
            type: input.type,
            recipientName: input.recipientName,
            recipientContact: input.recipientContact,
            subject: renderedSubject,
            template: templateName,
            status: lifecycle.status,
            sentAt: lifecycle.sentAt,
            metadata: {
                ...(input.metadata || {}),
                trigger: input.trigger,
                channel: input.type,
                templateId: template?.id ?? input.templateId,
                templateName,
                renderedSubject,
                renderedBody,
                providerMode: 'demo',
                providerMessageId,
                createdBy: input.createdBy,
                queuedAt: lifecycle.queuedAt,
                sentAt: lifecycle.sentAt,
                deliveredAt: 'deliveredAt' in lifecycle ? lifecycle.deliveredAt : undefined,
                failedAt: 'failedAt' in lifecycle ? lifecycle.failedAt : undefined,
                statusReason: lifecycle.statusReason,
            },
        },
    });
}
function getTriggerLabel(trigger) {
    return triggerLabels[trigger] || trigger.replace(/_/g, ' ');
}
function getCommunicationTemplateVariables(input) {
    return input;
}
//# sourceMappingURL=communications.js.map