export interface APIInterface<T = any> {
  data: T;
  message: string;
  statusCode: number;
  success: boolean;
}
