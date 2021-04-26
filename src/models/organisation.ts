export interface IOrganisation {
  uuid: string;
  membership: { tier: number; isActive: boolean }
  created?: string;
  updated?: string;
}