export const messageTypes = {
  credentialsUpdated: 'CredentialsUpdatedMessage',
};

export type BusEvent = CustomEvent<{
  payload?: Credentials;
  type: (typeof messageTypes)[keyof typeof messageTypes];
}>;

export type Bus = (callbackFn: (e: BusEvent) => void) => void;

export type Credentials = {
  clientId: string;
  clientUniqueKey?: string;
  expires?: number;
  grantedScopes?: Array<string>;
  requestedScopes: Array<string>;
  token?: string;
  userId?: string;
};

export type GetCredentials = (
  apiErrorSubStatus?: string,
) => Promise<Credentials>;

export type CredentialsProvider = {
  bus: Bus;
  getCredentials: GetCredentials;
};
