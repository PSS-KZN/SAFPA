import type { Document } from '../types';

export const documents: Document[] = [
  // Member documents
  { id: 'doc1', name: 'Sipho_Ndlovu_ID_Copy.pdf', type: 'id_copy', entityType: 'member', entityId: 'm1', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2025-12-02', size: '245 KB' },
  { id: 'doc2', name: 'Sipho_Ndlovu_Proof_of_Address.pdf', type: 'proof_of_address', entityType: 'member', entityId: 'm1', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2025-12-02', size: '180 KB' },
  { id: 'doc3', name: 'Nomsa_Dlamini_ID_Copy.pdf', type: 'id_copy', entityType: 'member', entityId: 'm2', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2025-12-16', size: '212 KB' },
  { id: 'doc4', name: 'Thandi_Mokoena_ID_Copy.pdf', type: 'id_copy', entityType: 'member', entityId: 'm3', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2026-01-06', size: '198 KB' },
  { id: 'doc5', name: 'Thandi_Mokoena_Consent_Form.pdf', type: 'consent_form', entityType: 'member', entityId: 'm3', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2026-01-06', size: '125 KB' },
  { id: 'doc6', name: 'Kagiso_Mthembu_ID_Copy.pdf', type: 'id_copy', entityType: 'member', entityId: 'm4', parlourId: 'p1', uploadedBy: 'Thabo Mokoena', uploadedAt: '2026-01-21', size: '230 KB' },
  { id: 'doc7', name: 'Zanele_Khumalo_ID_Copy.pdf', type: 'id_copy', entityType: 'member', entityId: 'm5', parlourId: 'p1', uploadedBy: 'Thabo Mokoena', uploadedAt: '2026-02-02', size: '205 KB' },
  // Policy documents
  { id: 'doc8', name: 'POL_UBT-2025-0001_PolicySchedule.pdf', type: 'policy_document', entityType: 'policy', entityId: 'pol1', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2025-12-05', size: '320 KB' },
  { id: 'doc9', name: 'POL_UBT-2025-0002_PolicySchedule.pdf', type: 'policy_document', entityType: 'policy', entityId: 'pol2', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2025-12-18', size: '305 KB' },
  { id: 'doc10', name: 'POL_UBT-2026-0003_PolicySchedule.pdf', type: 'policy_document', entityType: 'policy', entityId: 'pol3', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2026-01-08', size: '340 KB' },
  { id: 'doc11', name: 'POL_UBT-2026-0005_Reinstatement_Letter.pdf', type: 'other', entityType: 'policy', entityId: 'pol5', parlourId: 'p1', uploadedBy: 'Lindiwe Sithole', uploadedAt: '2026-03-10', size: '145 KB' },
  // Funeral case documents
  { id: 'doc12', name: 'FC001_Death_Certificate.pdf', type: 'death_certificate', entityType: 'funeral_case', entityId: 'fc1', parlourId: 'p1', uploadedBy: 'Sibongile Mthembu', uploadedAt: '2026-03-12', size: '285 KB' },
  { id: 'doc13', name: 'FC001_Burial_Order.pdf', type: 'burial_order', entityType: 'funeral_case', entityId: 'fc1', parlourId: 'p1', uploadedBy: 'Sibongile Mthembu', uploadedAt: '2026-03-13', size: '190 KB' },
  { id: 'doc14', name: 'FC002_Death_Certificate.pdf', type: 'death_certificate', entityType: 'funeral_case', entityId: 'fc2', parlourId: 'p1', uploadedBy: 'Sibongile Mthembu', uploadedAt: '2026-04-05', size: '275 KB' },
  { id: 'doc15', name: 'FC003_Death_Certificate.pdf', type: 'death_certificate', entityType: 'funeral_case', entityId: 'fc3', parlourId: 'p2', uploadedBy: 'Thabo Mokoena', uploadedAt: '2026-04-10', size: '260 KB' },
  { id: 'doc16', name: 'FC003_Burial_Order.pdf', type: 'burial_order', entityType: 'funeral_case', entityId: 'fc3', parlourId: 'p2', uploadedBy: 'Thabo Mokoena', uploadedAt: '2026-04-11', size: '175 KB' },
  { id: 'doc17', name: 'Boitumelo_Sithole_ID_Copy.pdf', type: 'id_copy', entityType: 'member', entityId: 'm6', parlourId: 'p2', uploadedBy: 'Zanele Mkhize', uploadedAt: '2026-01-16', size: '220 KB' },
  { id: 'doc18', name: 'Lethiwe_Nkosi_ID_Copy.pdf', type: 'id_copy', entityType: 'member', entityId: 'm7', parlourId: 'p2', uploadedBy: 'Zanele Mkhize', uploadedAt: '2026-02-11', size: '195 KB' },
];
