export interface ICreateIndexRequest {
  user: { 
    uuid: string;
  },
  membership: { tier: number; isActive: boolean }
}

export interface IChangeUserMembershipRequest {
  user: {
    uuid: string;
    sequence: number;
  };
  membership: { tier: number; isActive: boolean }
}

