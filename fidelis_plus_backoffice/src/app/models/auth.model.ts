export interface Company {
  id: number;
  name: string;
  loyalty_accounts?: any[];
}

import { UserRole } from './user-roles';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  name?: string; // Optionnel si encore utilisé ailleurs
  email: string;
  phone: string | null;
  role: UserRole;
  company_id: number | null;
  company?: Company;
  loyalty_accounts?: any[];
}

export interface MeResponse {
  status: string;
  data: User;
}

export interface AuthResponse {
  status: string;
  data: {
    user: User;
    token: string;
    token_type: string;
  };
}
