export interface IEventMessage {
  uuid: string | number;
  sequence: number;
  data: any;
  version: number;
  source: string;
  type: string;
}