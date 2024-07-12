export interface GOlrResponse {
  id: string;
  label: string;
  link: string;
  description: string;
  isObsolete: boolean;
  replacedBy: string;
  rootTypes: any[];
  xref: string;
  notAnnotatable: boolean;
}