export interface IBookmark {
  uuid: number;
  userId: string;
  organisationId: string;
  url: string;
  collection: { uuid: string };
  [key: string]: any;
}
