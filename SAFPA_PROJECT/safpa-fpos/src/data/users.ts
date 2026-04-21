import type { User } from '../types';

export const users: User[] = [
  { id: 'u1', name: 'Kagiso Mabena', email: 'kagiso@safpa.org.za', role: 'safpa_admin', status: 'active' },
  { id: 'u2', name: 'Nomvula Khumalo', email: 'nomvula@safpa.org.za', role: 'safpa_admin', status: 'active' },
  { id: 'u3', name: 'Bongani Ndlovu', email: 'bongani@ubuntufunerals.co.za', role: 'parlour_owner', parlourId: 'p1', status: 'active' },
  { id: 'u4', name: 'Thabo Mokoena', email: 'thabo@ubuntufunerals.co.za', role: 'branch_manager', parlourId: 'p1', branchId: 'b1', status: 'active' },
  { id: 'u5', name: 'Lindiwe Sithole', email: 'lindiwe@ubuntufunerals.co.za', role: 'policy_admin', parlourId: 'p1', branchId: 'b1', status: 'active' },
  { id: 'u6', name: 'Mpho Tau', email: 'mpho@ubuntufunerals.co.za', role: 'collections_clerk', parlourId: 'p1', branchId: 'b1', status: 'active' },
  { id: 'u7', name: 'Sibongile Mthembu', email: 'sibongile@ubuntufunerals.co.za', role: 'operations_coordinator', parlourId: 'p1', branchId: 'b1', status: 'active' },
  { id: 'u8', name: 'Ayanda Cele', email: 'ayanda@dignitymemorial.co.za', role: 'parlour_owner', parlourId: 'p2', status: 'active' },
  { id: 'u9', name: 'Zanele Mkhize', email: 'zanele@dignitymemorial.co.za', role: 'branch_manager', parlourId: 'p2', branchId: 'b4', status: 'active' },
  { id: 'u10', name: 'Noxolo Mtshali', email: 'noxolo@phakamafunerals.co.za', role: 'parlour_owner', parlourId: 'p3', status: 'active' },
];
