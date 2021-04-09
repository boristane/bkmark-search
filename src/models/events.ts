export interface IEventMessage {
  uuid: string | number;
  sequence: number | undefined;
  data: any;
  version: number;
  source: string;
  type: string;
}