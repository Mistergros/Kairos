export interface Risk {
  id: string;
  name: string;
  category: string;
  description: string;
  naf_specific?: string[];
  units?: string[];
}

export interface RiskContext {
  nafCode: string;
  unityId: string;
}
