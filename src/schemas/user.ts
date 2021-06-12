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

export interface IChangeOrganisationMembershipRequest {
  organisation: {
    uuid: string;
  };
  membership: { tier: number; isActive: boolean };
  oldMembership: { tier: number; isActive: boolean };
}

export interface IDeleteUserIndexRequest {
  user: {
    uuid: string;
  };
}

export interface IAddUserToOrganisationRequest {
  user: { uuid: string };
  organisation: { uuid: string };
}

export interface IRemoveUserFromOrganisationRequest {
  user: { uuid: string };
  organisation: { uuid: string };
}

export interface IAddUserToCollectionRequest {
  user?: { uuid: string };
  collection: { uuid: string; organisationId: string, userId: string; };
}

export interface IRemoveUserFromCollectionRequest {
  user: { uuid: string };
  collection: { uuid: string; organisationId: string, userId: string; };
}

export interface IRemoveCollectionFromUsersRequest {
  collection: { uuid: string; organisationId?: string, userId: string; users: string[]; };
}
