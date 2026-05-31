import { User } from './auth.model';

export type ProspectTemperature = 'froid' | 'tiede' | 'chaud';
export type KanbanStage = 'nouveau_lead' | 'contact_effectue' | 'proposition' | 'negociation' | 'closing' | 'client_actif';

export interface Prospect {
  id: number;
  name: string;
  siret?: string;
  type: 'prospect' | 'client';
  category: 'entreprise' | 'particulier';
  company_type?: 'flotte' | 'apporteur' | 'garage';
  address?: string;
  city?: string;
  zip_code?: string;
  sector?: string;
  lead_source?: string;
  estimated_potential?: number;
  estimated_decision_date?: string;
  needs?: string;
  temperature: ProspectTemperature;
  kanban_stage: KanbanStage;
  commercial_id: number;
  is_active: boolean;
  last_contact_date?: string;
  created_at: string;
  updated_at: string;
  contacts?: User[];
}

export interface CreateProspectDto {
  name: string;
  siret?: string;
  sector?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  temperature: ProspectTemperature;
  commercial_id: number;
  estimated_decision_date?: string;
  needs?: string;
  lead_source?: string;
  category: 'entreprise' | 'particulier';
  company_type?: 'flotte' | 'apporteur' | 'garage';
  
  // Correspondant
  contact_first_name: string;
  contact_last_name: string;
  contact_position?: string;
  contact_phone?: string;
  contact_email: string;
}
