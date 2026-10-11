/** How the fake provider treats a test card (plan §2B Payment). */
export enum CardBehaviour {
  Succeed = 'succeed',
  Decline = 'decline',
  Timeout = 'timeout',
}
