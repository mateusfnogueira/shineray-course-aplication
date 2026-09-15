export interface EmailOptions {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
}

export interface EmailAdapterInterface {
  send(options: EmailOptions): Promise<void>;
}
