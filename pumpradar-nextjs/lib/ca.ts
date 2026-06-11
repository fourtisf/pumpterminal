/** Official PumpTerminal token contract address (pump.fun mint). */
export const CONTRACT_ADDRESS = '5teQdcVxwaMGcm5LawKgRDpnyd14MPMExjmtDi7ypump';

export const PUMPFUN_COIN_URL = `https://pump.fun/coin/${CONTRACT_ADDRESS}`;

/** `5teQ…pump` — short display form, keeps the vanity suffix visible. */
export function shortCa(ca: string = CONTRACT_ADDRESS): string {
  return `${ca.slice(0, 4)}…${ca.slice(-4)}`;
}
