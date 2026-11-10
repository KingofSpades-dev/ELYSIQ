import { GuardLevel, GuardianState } from './types';

export function computeGuardianState(
  gameCertified: boolean,
  gameScore: number,
  playerTier: 'NONE' | 'BRONZE' | 'GOLD' | 'LEGENDARY'
): GuardianState {
  // If game is not certified
  if (!gameCertified) {
    if (gameScore < 40) {
      return {
        level: 'danger',
        expression: 'ALERT',
        message: 'Critical warning! This game failed audits. Do not approve transactions here.',
      };
    } else {
      return {
        level: 'caution',
        expression: 'SKEPTICAL',
        message: 'Uncertified game token. The stache is observing this environment closely.',
      };
    }
  }

  // If game is certified
  if (playerTier === 'LEGENDARY') {
    return {
      level: 'safe',
      expression: 'SATISFIED',
      message: 'Legendary Pass detected. Security clear. Enjoy your 30% XP boost!',
    };
  }

  if (playerTier === 'GOLD') {
    return {
      level: 'safe',
      expression: 'SATISFIED',
      message: 'Gold Pass detected. Sells verified. The stache approves this session.',
    };
  }

  if (playerTier === 'BRONZE') {
    return {
      level: 'safe',
      expression: 'NEUTRAL',
      message: 'Stache Pass detected. Security check completed successfully.',
    };
  }

  // Sesi game certified, tetapi player unverified (tier NONE)
  return {
    level: 'caution',
    expression: 'THINKING',
    message: 'Game certified, but you are unverified. Bind a Stache Pass to unlock full perks.',
  };
}

export function computeGuardCheckState(
  kind: 'wallet' | 'token',
  score: number,
  findings: string[]
): GuardianState {
  if (score < 40) {
    return {
      level: 'danger',
      expression: 'ALERT',
      message: `Critical alert: high risk ${kind} counterparty! ${findings[0] || 'Malicious signs detected.'}`,
    };
  }

  if (score < 70) {
    return {
      level: 'caution',
      expression: 'SKEPTICAL',
      message: `Caution: suspicious ${kind} history. ${findings[0] || 'Verify before signing.'}`,
    };
  }

  return {
    level: 'safe',
    expression: 'SATISFIED',
    message: `Counterparty ${kind} verified as safe. Sells and tokens match audit norms.`,
  };
}
