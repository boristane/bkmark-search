export interface ICreateOrganisationIndexRequest {
  organisation: {
    uuid: string;
    id: string;
    ownerId: string;
  };
  membership: { tier: number; isActive: boolean };
}
