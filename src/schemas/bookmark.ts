export interface IBookmarkRequest {
  uuid: number;
  userId: string;
  organisationId: string;
  collection: { uuid: string };
  url: string;
  [key: string]: any;
}