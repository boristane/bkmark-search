export interface ICreateIndexRequest {
  user: {
    uuid: string;
  };
  membership: { tier: number; isActive: boolean };
}

export interface IChangeUserMembershipRequest {
  user: {
    uuid: string;
  };
  membership: { tier: number; isActive: boolean };
}

export interface IDeleteIndexRequest {
  user: {
    uuid: string;
  };
}
