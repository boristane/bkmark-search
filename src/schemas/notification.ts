export interface IBookmarkNotificationCreateRequest {
  notification: IBookmarkNotificationRequest;
  bookmark: {
    uuid: number;
    userId: string;
    organisationId: string;
    collection: { uuid: string };
    url: string;
    [key: string]: any;
  }
}

export interface IBookmarkNotificationRequest {
  userId: string;
  organisationId: string;
  collectionId: string;
  bookmarkId: number;
  notifierId: string;
  uuid: number;
  seen: boolean;
}
