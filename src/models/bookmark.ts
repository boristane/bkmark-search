export interface IBookmark {
  uuid: number;
  userId: string;
  organisationId: string;
  collection: { uuid: string };
  [key: string]: any;
}
