export interface IUser {
  uuid: string;
  organisations?: string[];
  collections?: Array<{ ownerId: string; uuid: string, isOrganisation: boolean }>;
  membership: { tier: number; isActive: boolean };
  created?: string;
  updated?: string;
}
