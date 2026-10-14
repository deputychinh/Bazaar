/** How emails leave the service: SMTP (Mailpit locally) or the SES API (AWS, Pod Identity). */
export enum MailTransport {
  Smtp = 'smtp',
  Ses = 'ses',
}
