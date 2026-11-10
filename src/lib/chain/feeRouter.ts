import { parseAbi } from 'viem';

/** ABI subset of contracts/ElysiqFeeRouter.sol used by the app. */
export const feeRouterAbi = parseAbi([
  'function payFee(uint256 amount, bytes32 ref)',
  'function payFeeStable(address stable, uint256 amount, bytes32 ref)',
  'function totalBurned() view returns (uint256)',
  'function burnBps() view returns (uint16)',
  'function buybackAndBurn(address stable, uint256 amountIn, uint256 minElysiqOut, address target, bytes swapData)',
  'event FeePaid(address indexed payer, bytes32 indexed ref, address indexed token, uint256 amount, uint256 burned, uint256 toTreasury)',
  'event BuybackBurned(address indexed stable, uint256 stableIn, uint256 elysiqBurned)',
]);

export const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD' as const;
