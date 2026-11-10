// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}

/// @title ELYSIQ Fee Router
/// @notice Collects scan/certification fees in $ELYSIQ (burning a share) or in an allowlisted
///         stablecoin, and lets a keeper swap stablecoin revenue into $ELYSIQ and burn it.
/// @dev "Burn" sends tokens to the dead address, so it works with any plain ERC-20.
///      Fee payments are plain ERC-20 `transferFrom` calls into this contract, so the backend can
///      verify a payment from the token's Transfer event (wallet -> router).
contract ElysiqFeeRouter {
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint16 public constant MAX_BURN_BPS = 5_000;

    IERC20 public immutable elysiq;

    address public owner;
    address public keeper;
    address public treasury;
    uint16 public burnBps = 2_000; // 20%

    mapping(address => bool) public acceptedStable;
    mapping(address => bool) public swapTarget;

    uint256 public totalBurned;
    uint256 private _lock = 1;

    event FeePaid(address indexed payer, bytes32 indexed ref, address indexed token, uint256 amount, uint256 burned, uint256 toTreasury);
    event BuybackBurned(address indexed stable, uint256 stableIn, uint256 elysiqBurned);
    event ConfigChanged(string what);

    error NotOwner();
    error NotKeeper();
    error Reentrancy();
    error BadParam();
    error TransferFailed();
    error SlippageExceeded();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier onlyKeeper() { if (msg.sender != keeper && msg.sender != owner) revert NotKeeper(); _; }
    modifier nonReentrant() { if (_lock != 1) revert Reentrancy(); _lock = 2; _; _lock = 1; }

    constructor(address _elysiq, address _treasury, address _keeper) {
        if (_elysiq == address(0) || _treasury == address(0)) revert BadParam();
        elysiq = IERC20(_elysiq);
        treasury = _treasury;
        keeper = _keeper;
        owner = msg.sender;
    }

    // ── Payments ──────────────────────────────────────

    /// @notice Pay a fee in $ELYSIQ. `burnBps` of it is burned, the rest goes to the treasury.
    /// @param ref Opaque reference (e.g. keccak256 of the scanned token address).
    function payFee(uint256 amount, bytes32 ref) external nonReentrant {
        if (amount == 0) revert BadParam();
        _pull(address(elysiq), msg.sender, amount);
        uint256 burned = (amount * burnBps) / 10_000;
        uint256 toTreasury = amount - burned;
        if (burned > 0) { _push(address(elysiq), DEAD, burned); totalBurned += burned; }
        _push(address(elysiq), treasury, toTreasury);
        emit FeePaid(msg.sender, ref, address(elysiq), amount, burned, toTreasury);
    }

    /// @notice Pay a fee in an accepted stablecoin. Kept in the router until the next buyback.
    function payFeeStable(address stable, uint256 amount, bytes32 ref) external nonReentrant {
        if (!acceptedStable[stable] || amount == 0) revert BadParam();
        _pull(stable, msg.sender, amount);
        emit FeePaid(msg.sender, ref, stable, amount, 0, amount);
    }

    // ── Buyback & burn ────────────────────────────────

    /// @notice Swap `amountIn` of `stable` held by the router into $ELYSIQ through an allowlisted
    ///         aggregator (0x / KyberSwap calldata supplied by the keeper), then burn what arrived.
    function buybackAndBurn(
        address stable,
        uint256 amountIn,
        uint256 minElysiqOut,
        address target,
        bytes calldata swapData
    ) external onlyKeeper nonReentrant {
        if (!acceptedStable[stable] || !swapTarget[target] || amountIn == 0 || minElysiqOut == 0) revert BadParam();

        uint256 before = elysiq.balanceOf(address(this));
        _approve(stable, target, amountIn);
        (bool ok, ) = target.call(swapData);
        _approve(stable, target, 0);
        if (!ok) revert TransferFailed();

        uint256 received = elysiq.balanceOf(address(this)) - before;
        if (received < minElysiqOut) revert SlippageExceeded();

        _push(address(elysiq), DEAD, received);
        totalBurned += received;
        emit BuybackBurned(stable, amountIn, received);
    }

    // ── Admin ─────────────────────────────────────────

    function setBurnBps(uint16 bps) external onlyOwner { if (bps > MAX_BURN_BPS) revert BadParam(); burnBps = bps; emit ConfigChanged("burnBps"); }
    function setTreasury(address t) external onlyOwner { if (t == address(0)) revert BadParam(); treasury = t; emit ConfigChanged("treasury"); }
    function setKeeper(address k) external onlyOwner { keeper = k; emit ConfigChanged("keeper"); }
    function setAcceptedStable(address s, bool ok) external onlyOwner { acceptedStable[s] = ok; emit ConfigChanged("stable"); }
    function setSwapTarget(address t, bool ok) external onlyOwner { swapTarget[t] = ok; emit ConfigChanged("swapTarget"); }
    function transferOwnership(address o) external onlyOwner { if (o == address(0)) revert BadParam(); owner = o; emit ConfigChanged("owner"); }

    /// @notice Move accumulated stablecoin revenue to the treasury.
    function sweepStable(address stable, uint256 amount) external onlyOwner nonReentrant {
        _push(stable, treasury, amount);
    }

    // ── ERC-20 helpers (tolerate tokens that return nothing) ──

    function _pull(address token, address from, uint256 amount) private {
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, address(this), amount));
        if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
    }
    function _push(address token, address to, uint256 amount) private {
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
    }
    function _approve(address token, address spender, uint256 amount) private {
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, amount));
        if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
    }
}
