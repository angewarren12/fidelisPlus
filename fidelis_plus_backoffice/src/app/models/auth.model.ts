export interface Company {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  rccm?: string | null;
  address?: string | null;
  city?: string | null;
  zip_code?: string | null;
  sector?: string | null;
  category?: string | null;
  company_type?: string | null;
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
  must_change_password?: boolean;
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
