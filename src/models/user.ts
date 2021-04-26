export interface IUser {
  uuid: string;
  organisations?: string[];
  collections?: string[];
  membership: { tier: number; isActive: boolean }
  created?: string;
  updated?: string;
}
