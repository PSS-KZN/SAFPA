"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assistantRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const assistantRequestSchema = zod_1.z.object({
    message: zod_1.z.string().optional(),
    history: zod_1.z.array(zod_1.z.object({ role: zod_1.z.enum(['user', 'assistant']), content: zod_1.z.string() })).optional(),
    context: zod_1.z.object({
        page: zod_1.z.string().optional(),
        entityType: zod_1.z.enum(['policy', 'member', 'funeral_case']).optional(),
        entityId: zod_1.z.string().optional(),
        currentPath: zod_1.z.string().optional(),
    }).optional(),
});
function normalizePrompt(value) {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function roleCapabilitySummary(role) {
    const summaries = {
        safpa_admin: 'You can view network-wide parlour, adoption, reporting, and oversight data across the federation.',
        parlour_owner: 'You can view and manage members, policies, collections, communications, documents, and funeral cases for your parlour.',
        branch_manager: 'You can only view branch-scoped operational data tied to your branch.',
        policy_admin: 'You can work with leads, members, policies, communications, reports, and policy/member documents for your parlour.',
        collections_clerk: 'You can work with collections, balances, receipts, arrears, communications, and reports for your parlour.',
        operations_coordinator: 'You can work with funeral cases, operational communications, funeral-case documents, and operational reporting.',
        policyholder_customer: 'You can only access your own policy, payments, documents, claim history, and support information.',
    };
    return summaries[role] || 'Your answers are restricted to the records visible in your current role scope.';
}
function policyStatusMeaning(status) {
    const meanings = {
        draft: 'The policy has been created but is not yet ready for cover to begin.',
        pending: 'The policy is awaiting activation and may still be in onboarding or validation.',
        active: 'The policy is in force and cover is intended to be active.',
        suspended: 'The policy has been paused, usually because of arrears or a servicing issue.',
        lapsed: 'The policy is no longer in force because it moved beyond suspension into lapse.',
        reinstated: 'The policy has been restored after a lapse or suspension and can move back to active.',
        cancelled: 'The policy has been cancelled and is no longer serviceable.',
        closed: 'The policy lifecycle is complete and closed out.',
    };
    return meanings[status] || `The policy is currently ${status}.`;
}
function allowedPolicyTransitions(policy) {
    if (policy.allowedStatusTransitions && typeof policy.allowedStatusTransitions === 'object' && !Array.isArray(policy.allowedStatusTransitions)) {
        const allowed = policy.allowedStatusTransitions[policy.status];
        if (Array.isArray(allowed)) {
            return allowed.filter((item) => typeof item === 'string');
        }
    }
    const defaults = {
        draft: ['pending', 'cancelled'],
        pending: ['active', 'cancelled'],
        active: ['suspended', 'lapsed', 'closed', 'cancelled'],
        suspended: ['active', 'reinstated', 'lapsed', 'cancelled'],
        lapsed: ['reinstated', 'closed'],
        reinstated: ['active', 'suspended', 'cancelled'],
        cancelled: [],
        closed: [],
    };
    return defaults[policy.status] || [];
}
function countJsonArrayItems(value) {
    return Array.isArray(value) ? value.length : 0;
}
function countOpenTaskItems(value) {
    if (!Array.isArray(value)) {
        return 0;
    }
    return value.filter((task) => {
        if (!task || typeof task !== 'object' || !('completed' in task)) {
            return false;
        }
        return task.completed !== true;
    }).length;
}
async function visibleMemberIds(actor) {
    if (actor.role === 'safpa_admin') {
        const members = await prisma_1.prisma.member.findMany({ select: { id: true } });
        return members.map((member) => member.id);
    }
    if (actor.role === 'policyholder_customer') {
        return actor.memberId ? [actor.memberId] : [];
    }
    if (!actor.parlourId) {
        return [];
    }
    const members = await prisma_1.prisma.member.findMany({
        where: {
            parlourId: actor.parlourId,
            ...(actor.role === 'branch_manager' && actor.branchId ? { branchId: actor.branchId } : {}),
        },
        select: { id: true },
    });
    return members.map((member) => member.id);
}
async function visiblePolicies(actor) {
    if (actor.role === 'operations_coordinator') {
        return [];
    }
    if (actor.role === 'safpa_admin') {
        return prisma_1.prisma.policy.findMany({ orderBy: { createdAt: 'desc' } });
    }
    const memberIds = await visibleMemberIds(actor);
    if (memberIds.length === 0) {
        return [];
    }
    return prisma_1.prisma.policy.findMany({
        where: {
            memberId: { in: memberIds },
            ...(actor.parlourId ? { parlourId: actor.parlourId } : {}),
        },
        orderBy: { createdAt: 'desc' },
    });
}
async function visibleDocuments(actor) {
    if (actor.role === 'safpa_admin') {
        return prisma_1.prisma.documentRecord.findMany({ orderBy: { createdAt: 'desc' } });
    }
    if (actor.role === 'policyholder_customer') {
        const policies = await visiblePolicies(actor);
        const policyIds = policies.map((policy) => policy.id);
        return prisma_1.prisma.documentRecord.findMany({
            where: {
                OR: [
                    ...(actor.memberId ? [{ entityType: 'member', entityId: actor.memberId }] : []),
                    ...(policyIds.length > 0 ? [{ entityType: 'policy', entityId: { in: policyIds } }] : []),
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    if (!actor.parlourId) {
        return [];
    }
    const allowedTypes = actor.role === 'operations_coordinator'
        ? ['funeral_case']
        : actor.role === 'policy_admin'
            ? ['member', 'policy']
            : ['member', 'policy', 'funeral_case'];
    return prisma_1.prisma.documentRecord.findMany({
        where: {
            parlourId: actor.parlourId,
            entityType: { in: allowedTypes },
        },
        orderBy: { createdAt: 'desc' },
    });
}
async function visibleFuneralCases(actor) {
    if (actor.role === 'safpa_admin') {
        return prisma_1.prisma.funeralCase.findMany({ orderBy: { createdAt: 'desc' } });
    }
    if (actor.role === 'policyholder_customer') {
        if (!actor.memberId) {
            return [];
        }
        return prisma_1.prisma.funeralCase.findMany({
            where: { memberId: actor.memberId },
            orderBy: { createdAt: 'desc' },
        });
    }
    if (!actor.parlourId || actor.role === 'policy_admin' || actor.role === 'collections_clerk') {
        return [];
    }
    return prisma_1.prisma.funeralCase.findMany({
        where: {
            parlourId: actor.parlourId,
            ...(actor.role === 'branch_manager' && actor.branchId ? { branchId: actor.branchId } : {}),
        },
        orderBy: { createdAt: 'desc' },
    });
}
async function visibleMembers(actor) {
    if (actor.role === 'safpa_admin') {
        return prisma_1.prisma.member.findMany({ orderBy: { createdAt: 'desc' } });
    }
    if (actor.role === 'policyholder_customer') {
        if (!actor.memberId) {
            return [];
        }
        return prisma_1.prisma.member.findMany({ where: { id: actor.memberId }, orderBy: { createdAt: 'desc' } });
    }
    if (!actor.parlourId) {
        return [];
    }
    return prisma_1.prisma.member.findMany({
        where: {
            parlourId: actor.parlourId,
            ...(actor.role === 'branch_manager' && actor.branchId ? { branchId: actor.branchId } : {}),
        },
        orderBy: { createdAt: 'desc' },
    });
}
function findPolicyFromPrompt(policies, members, prompt, contextPolicyId) {
    if (contextPolicyId) {
        const contextual = policies.find((policy) => policy.id === contextPolicyId);
        if (contextual) {
            return contextual;
        }
    }
    const byNumber = policies.find((policy) => prompt.includes(normalizePrompt(policy.policyNumber)));
    if (byNumber) {
        return byNumber;
    }
    for (const member of members) {
        const fullName = normalizePrompt(`${member.firstName} ${member.lastName}`);
        if (!fullName || !prompt.includes(fullName)) {
            continue;
        }
        const match = policies.find((policy) => policy.memberId === member.id);
        if (match) {
            return match;
        }
    }
    return policies[0];
}
function findMemberFromPrompt(members, prompt, contextMemberId) {
    if (contextMemberId) {
        const contextual = members.find((member) => member.id === contextMemberId);
        if (contextual) {
            return contextual;
        }
    }
    const byName = members.find((member) => prompt.includes(normalizePrompt(`${member.firstName} ${member.lastName}`)));
    if (byName) {
        return byName;
    }
    return members[0];
}
function findFuneralCaseFromPrompt(funeralCases, prompt, contextCaseId) {
    if (contextCaseId) {
        const contextual = funeralCases.find((funeralCase) => funeralCase.id === contextCaseId);
        if (contextual) {
            return contextual;
        }
    }
    const byCaseNumber = funeralCases.find((funeralCase) => prompt.includes(normalizePrompt(funeralCase.caseNumber)));
    if (byCaseNumber) {
        return byCaseNumber;
    }
    const byDeceased = funeralCases.find((funeralCase) => prompt.includes(normalizePrompt(funeralCase.deceasedName)));
    if (byDeceased) {
        return byDeceased;
    }
    return funeralCases[0];
}
exports.assistantRouter = (0, express_1.Router)();
exports.assistantRouter.post('/chat', async (req, res) => {
    const parsed = assistantRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid assistant payload', errors: parsed.error.flatten() });
    }
    const actor = req.actor;
    if (!actor) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    const prompt = normalizePrompt(parsed.data.message || '');
    if (!prompt) {
        return res.json({
            answer: `Ask me about a policy, role access, claims, documents, payments, or policies at risk. I will answer using the rules and records available to your ${actor.role} session.`,
            suggestions: ['Explain a policy', 'What can I do in my role?', 'Show policies at risk'],
            appliedRole: actor.role,
            guardrail: 'Responses are limited to visible records and the current role scope.',
        });
    }
    const [policies, members, documents, funeralCases] = await Promise.all([
        visiblePolicies(actor),
        visibleMembers(actor),
        visibleDocuments(actor),
        visibleFuneralCases(actor),
    ]);
    const policyMemberLabels = members.map((member) => ({ id: member.id, firstName: member.firstName, lastName: member.lastName }));
    const policy = findPolicyFromPrompt(policies, policyMemberLabels, prompt, parsed.data.context?.entityType === 'policy' ? parsed.data.context.entityId : undefined);
    const member = findMemberFromPrompt(members, prompt, parsed.data.context?.entityType === 'member' ? parsed.data.context.entityId : undefined);
    const funeralCase = findFuneralCaseFromPrompt(funeralCases, prompt, parsed.data.context?.entityType === 'funeral_case' ? parsed.data.context.entityId : undefined);
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(prompt)) {
        return res.json({
            answer: `Hello. I’m ready to help in the ${actor.role} workspace. Ask about a policy, a payment situation, role permissions, required documents, or policies at risk and I will respond using the records and rules available in your current scope.`,
            suggestions: ['Explain a policy', 'What can I do in my role?', 'Show policies at risk'],
            appliedRole: actor.role,
            guardrail: 'Responses are limited to visible records and the current role scope.',
        });
    }
    if (prompt.includes('role') || prompt.includes('permission') || prompt.includes('access') || prompt.includes('what can i do')) {
        return res.json({
            answer: `${roleCapabilitySummary(actor.role)} The assistant will not answer outside that scope.`,
            suggestions: ['Explain a policy', 'Show policies at risk', 'What documents are needed for a claim?'],
            appliedRole: actor.role,
            guardrail: `Role enforcement is based on the current ${actor.role} session and record scope.`,
        });
    }
    if (member && ((prompt.includes('member') || prompt.includes('customer') || prompt.includes('person') || prompt.includes('profile')) || (parsed.data.context?.entityType === 'member' && prompt.includes('explain')))) {
        const memberPolicies = policies.filter((item) => item.memberId === member.id);
        const successfulPayments = await prisma_1.prisma.paymentTransaction.count({ where: { memberId: member.id, status: 'successful' } });
        const dependantCount = countJsonArrayItems(member.dependants);
        const beneficiaryCount = countJsonArrayItems(member.beneficiaries);
        return res.json({
            answer: `${member.firstName} ${member.lastName} is currently an ${member.status} member in ${member.city}, ${member.province}. Their join date is ${member.joinDate}, and I can see ${memberPolicies.length} policy${memberPolicies.length === 1 ? '' : 'ies'} linked to this member, ${successfulPayments} successful payment${successfulPayments === 1 ? '' : 's'}, ${dependantCount} dependant${dependantCount === 1 ? '' : 's'}, and ${beneficiaryCount} beneficiar${beneficiaryCount === 1 ? 'y' : 'ies'}. This explanation is based on the member profile currently visible to your ${actor.role} role.`,
            suggestions: ['Explain a policy', 'What should I do next for this member?', 'What documents are needed?'],
            appliedRole: actor.role,
            guardrail: `Member explanations are limited to records visible to the ${actor.role} role.`,
        });
    }
    if (member && (prompt.includes('next step') || prompt.includes('what should i do') || prompt.includes('what do i do next')) && parsed.data.context?.entityType === 'member') {
        const memberPolicies = policies.filter((item) => item.memberId === member.id);
        const nextStep = memberPolicies.length === 0
            ? 'Review whether this member should be linked to a policy product and confirm their onboarding details are complete.'
            : 'Review linked policy status, current arrears exposure, and whether any documents or beneficiary updates are outstanding.';
        return res.json({
            answer: `The most sensible next step for ${member.firstName} ${member.lastName} is: ${nextStep}`,
            suggestions: ['Explain this member', 'Explain a policy', 'What documents are needed?'],
            appliedRole: actor.role,
            guardrail: 'Next-step guidance is generated from the visible member and linked policy state.',
        });
    }
    if (funeralCase && ((prompt.includes('funeral') || prompt.includes('case') || prompt.includes('deceased') || prompt.includes('service')) || (parsed.data.context?.entityType === 'funeral_case' && prompt.includes('explain')))) {
        const openTasks = countOpenTaskItems(funeralCase.tasks);
        const notesCount = countJsonArrayItems(funeralCase.notes);
        return res.json({
            answer: `Funeral case ${funeralCase.caseNumber} for ${funeralCase.deceasedName} is currently ${funeralCase.status}. The case type is ${funeralCase.caseType}, the coordinator is ${funeralCase.coordinatorName}, the date of death is ${funeralCase.dateOfDeath}, and the funeral date is ${funeralCase.funeralDate || 'not yet scheduled'}. I can see ${openTasks} open task${openTasks === 1 ? '' : 's'}, ${notesCount} note${notesCount === 1 ? '' : 's'}, and ${funeralCase.bodyCollected ? 'the body has already been collected.' : 'body collection is still pending.'}`,
            suggestions: ['What should I do next for this case?', 'What documents are needed?', 'Show communications for this case'],
            appliedRole: actor.role,
            guardrail: `Funeral case explanations are limited to records visible to the ${actor.role} role.`,
        });
    }
    if (funeralCase && (prompt.includes('next step') || prompt.includes('what should i do') || prompt.includes('what do i do next')) && parsed.data.context?.entityType === 'funeral_case') {
        const nextStep = funeralCase.status === 'logged'
            ? 'Confirm body collection, assign the first operational tasks, and gather the required case documents.'
            : funeralCase.status === 'in_progress'
                ? 'Review open tasks, supplier readiness, and scheduling milestones to keep the service on track.'
                : funeralCase.status === 'scheduled'
                    ? 'Verify all staff, vehicles, suppliers, and family coordination details before the service date.'
                    : 'Review closure tasks, archive readiness, and any required follow-up items.';
        return res.json({
            answer: `The most sensible next step for case ${funeralCase.caseNumber} is: ${nextStep}`,
            suggestions: ['Explain this case', 'What documents are needed?', 'Show communications for this case'],
            appliedRole: actor.role,
            guardrail: 'Next-step guidance is generated from the visible funeral case state.',
        });
    }
    if (policy && ((prompt.includes('policy') || prompt.includes('cover') || prompt.includes('benefit') || prompt.includes('status') || prompt.includes('reinstat')))) {
        const member = members.find((item) => item.id === policy.memberId);
        const paymentCount = await prisma_1.prisma.paymentTransaction.count({ where: { policyId: policy.id } });
        return res.json({
            answer: `Policy ${policy.policyNumber}${member ? ` for ${member.firstName} ${member.lastName}` : ''} is ${policy.status}. ${policyStatusMeaning(policy.status)} It is on ${policy.productName} with cover of R${policy.coverAmount.toLocaleString()} and a ${policy.billingFrequency} premium of R${policy.premiumAmount}. ${policy.arrearsAmount > 0 ? `The policy currently has arrears of R${policy.arrearsAmount}.` : 'The policy currently has no arrears.'} ${policy.waitingPeriodDays > 0 ? `The waiting period is ${policy.waitingPeriodDays} days from ${policy.startDate}.` : 'There is no waiting period configured.'} I can also see ${paymentCount} recorded payment${paymentCount === 1 ? '' : 's'} for this policy. The next allowed status changes are ${allowedPolicyTransitions(policy).join(', ') || 'none'}.`,
            suggestions: ['Why is this policy status what it is?', 'What should I do next for this policy?', 'What documents are needed for reinstatement?'],
            appliedRole: actor.role,
            guardrail: `Response limited to policy data visible to the ${actor.role} role.`,
        });
    }
    if (policy && ((prompt.includes('why') || prompt.includes('reason')) && (prompt.includes('status') || prompt.includes('suspended') || prompt.includes('lapsed') || prompt.includes('pending')))) {
        const reason = policy.status === 'suspended'
            ? policy.arrearsAmount > 0
                ? `The strongest visible reason is arrears of R${policy.arrearsAmount}.`
                : 'The policy is suspended, but the visible record does not show arrears as the reason.'
            : policy.status === 'lapsed'
                ? `The policy is lapsed, which means it has moved beyond active servicing. Visible arrears are R${policy.arrearsAmount}.`
                : policy.status === 'pending'
                    ? 'The policy is still pending, so activation has not been completed yet.'
                    : `The policy is ${policy.status}, which means ${policyStatusMeaning(policy.status).toLowerCase()}`;
        return res.json({
            answer: `For policy ${policy.policyNumber}, ${reason} The current next due date is ${policy.nextDueDate}, the last payment date is ${policy.lastPaymentDate || 'not recorded'}, and the next allowed transitions are ${allowedPolicyTransitions(policy).join(', ') || 'none'}.`,
            suggestions: ['Explain this policy', 'What should I do next for this policy?', 'Show policies at risk'],
            appliedRole: actor.role,
            guardrail: `Status reasoning is limited to the visible fields available to ${actor.role}.`,
        });
    }
    if (policy && (prompt.includes('payment') || prompt.includes('premium') || prompt.includes('due date') || prompt.includes('last payment'))) {
        const payments = await prisma_1.prisma.paymentTransaction.findMany({ where: { policyId: policy.id }, orderBy: { createdAt: 'desc' } });
        const lastSuccessful = payments.find((payment) => payment.status === 'successful');
        return res.json({
            answer: `For policy ${policy.policyNumber}, the premium is R${policy.premiumAmount} on a ${policy.billingFrequency} cycle, the next due date is ${policy.nextDueDate}, and arrears are currently R${policy.arrearsAmount}. I can see ${payments.length} recorded payment${payments.length === 1 ? '' : 's'} in scope${lastSuccessful ? `, with the latest successful payment on ${lastSuccessful.date}` : ''}. Payment and arrears questions are answered from the policy balance plus recorded transactions currently visible to you.`,
            suggestions: ['Explain this policy', 'Why is this policy status what it is?', 'Show policies at risk'],
            appliedRole: actor.role,
            guardrail: `Payment answers are restricted to visible transactions for ${actor.role}.`,
        });
    }
    if (policy && (prompt.includes('next step') || prompt.includes('what should i do') || prompt.includes('what do i do next') || prompt.includes('what now'))) {
        const nextStep = policy.status === 'pending'
            ? 'Review onboarding requirements and activate the policy when the record is ready.'
            : policy.status === 'suspended'
                ? policy.arrearsAmount > 0
                    ? `Prioritize settling arrears of R${policy.arrearsAmount}, then consider reactivation or reinstatement according to the allowed transitions.`
                    : 'Review why the policy is suspended and move it through the allowed status transitions.'
                : policy.status === 'lapsed'
                    ? 'Review reinstatement viability, supporting documents, and any outstanding balance before moving it forward.'
                    : policy.status === 'active'
                        ? 'Monitor arrears, keep payments current, and keep documents up to date.'
                        : `Review the current lifecycle state and use one of the allowed next transitions: ${allowedPolicyTransitions(policy).join(', ') || 'none'}.`;
        return res.json({
            answer: `The most sensible next step for policy ${policy.policyNumber} is: ${nextStep} From your ${actor.role} role, I will only recommend actions that fit the visible policy state and your scope.`,
            suggestions: ['Explain this policy', 'What documents are needed for reinstatement?', 'Why is this policy status what it is?'],
            appliedRole: actor.role,
            guardrail: 'Next-step guidance is generated from visible state within your current scope.',
        });
    }
    if (prompt.includes('claim') || prompt.includes('document') || prompt.includes('support')) {
        const sampleDocuments = documents.slice(0, 3).map((document) => document.name).join(', ');
        const base = actor.role === 'operations_coordinator'
            ? 'For funeral operations, focus on death notices, supporting IDs, claim forms, and service-related case documents.'
            : actor.role === 'policyholder_customer'
                ? 'For customer questions, answers stay limited to your own policy-linked and member-linked documents.'
                : 'For policy claims or reinstatement, answers explain the required document pack using workflow rules plus the documents already on file.';
        return res.json({
            answer: `${base} In your current scope, I can see ${documents.length} accessible documents${sampleDocuments ? `, including ${sampleDocuments}` : ''}. I can also see ${funeralCases.length} accessible funeral case records. I use those visible records together with workflow rules to answer document and claim questions consistently.`,
            suggestions: ['Explain a policy', 'What can I do in my role?', 'Show policies at risk'],
            appliedRole: actor.role,
            guardrail: `Claim and document guidance is restricted to records visible to ${actor.role}.`,
        });
    }
    if (prompt.includes('risk') || prompt.includes('arrears') || prompt.includes('overdue') || prompt.includes('lapsed') || prompt.includes('suspend')) {
        const atRiskPolicies = policies.filter((item) => item.arrearsAmount > 0 || ['pending', 'suspended', 'lapsed'].includes(item.status));
        const examples = atRiskPolicies.slice(0, 3).map((item) => `${item.policyNumber} (${item.status}, arrears R${item.arrearsAmount})`).join('; ');
        return res.json({
            answer: `Within your current scope, I can see ${atRiskPolicies.length} policies that look at risk because they are pending, suspended, lapsed, or in arrears. ${examples ? `Examples: ${examples}.` : 'There are no risky policies visible right now.'} This assessment is based on the policy status and arrears data currently visible in your workspace.`,
            suggestions: ['Explain a policy', 'What can I do in my role?', 'What documents are needed for reinstatement?'],
            appliedRole: actor.role,
            guardrail: `Risk analysis is limited to policy records visible to ${actor.role}.`,
        });
    }
    return res.json({
        answer: `I answer using the current session role, the records visible in your workspace, and the operating rules available to me. ${roleCapabilitySummary(actor.role)}`,
        suggestions: ['Explain a policy', 'What can I do in my role?', 'Show policies at risk'],
        appliedRole: actor.role,
        guardrail: 'Responses are generated from visible records and assistant rules within your current scope.',
    });
});
//# sourceMappingURL=assistant.js.map