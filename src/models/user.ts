export interface IUser {
  uuid: string;
  sequence: number;
  membership: { tier: number; isActive: boolean }
  created?: string;
  updated?: string;
}
