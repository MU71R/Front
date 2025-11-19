export interface Decision {
  _id?: string;         
  title: string;
  description?: string;
  sector?: any;
  supervisor?: any;
}
export interface Declaration {
  type: string;
  title: string;
  message: string;
  supervisorId?: string;
  createdAt?: string;
}
