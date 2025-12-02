export interface Unity {
  id: string;
  name: string;
  description?: string;
}

export interface UnityContext {
  unity: Unity;
  severity: number;
  probability: number;
  control: number;
}
