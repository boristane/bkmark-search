export interface IUser {
  uuid: string;
  membership: { tier: number; isActive: boolean }
  created?: string;
  updated?: string;
}
