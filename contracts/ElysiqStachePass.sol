// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title ELYSIQ Stache Pass
/// @notice One ERC-721 per certified token. The pass records the certification tier and trust score;
///         the JSON metadata (name, image, attributes) is served by the ELYSIQ API from `baseURI`.
/// @dev Minting is restricted to a `minter` (the ELYSIQ backend). The pass is transferable on purpose:
///      games read "who holds a Stache Pass" through ERC721Enumerable. At most one pass exists per
///      certified token address; re-certification updates the tier on the existing pass.
contract ElysiqStachePass is ERC721Enumerable, Ownable {
    uint8 public constant BRONZE = 1;
    uint8 public constant GOLD = 2;
    uint8 public constant LEGENDARY = 3;

    struct Pass {
        address certifiedToken;
        uint8 tier;
        uint8 trustScore; // 0-100
        uint64 certifiedAt;
    }

    address public minter;
    string private _baseTokenURI;
    uint256 public nextTokenId = 1;

    mapping(uint256 => Pass) public passes;
    /// @notice tokenId of the pass issued for a certified token (0 = none).
    mapping(address => uint256) public passOf;

    event PassMinted(uint256 indexed tokenId, address indexed certifiedToken, address indexed to, uint8 tier, uint8 trustScore);
    event PassUpdated(uint256 indexed tokenId, uint8 tier, uint8 trustScore);
    event MinterChanged(address indexed minter);
    event BaseURIChanged(string baseURI);

    error NotMinter();
    error BadTier();
    error BadScore();
    error BadAddress();
    error AlreadyCertified(uint256 tokenId);
    error NoPass();

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    constructor(address initialOwner, address initialMinter, string memory baseURI_)
        ERC721("ELYSIQ Stache Pass", "STACHE")
        Ownable(initialOwner)
    {
        minter = initialMinter;
        _baseTokenURI = baseURI_;
    }

    function mint(address to, address certifiedToken, uint8 tier, uint8 trustScore) external onlyMinter returns (uint256 tokenId) {
        if (to == address(0) || certifiedToken == address(0)) revert BadAddress();
        _checkTier(tier, trustScore);
        uint256 existing = passOf[certifiedToken];
        if (existing != 0) revert AlreadyCertified(existing);

        tokenId = nextTokenId++;
        passOf[certifiedToken] = tokenId;
        passes[tokenId] = Pass(certifiedToken, tier, trustScore, uint64(block.timestamp));
        _safeMint(to, tokenId);
        emit PassMinted(tokenId, certifiedToken, to, tier, trustScore);
    }

    /// @notice Re-certification: change tier/score of the existing pass.
    function updatePass(address certifiedToken, uint8 tier, uint8 trustScore) external onlyMinter {
        uint256 tokenId = passOf[certifiedToken];
        if (tokenId == 0) revert NoPass();
        _checkTier(tier, trustScore);
        Pass storage p = passes[tokenId];
        p.tier = tier;
        p.trustScore = trustScore;
        p.certifiedAt = uint64(block.timestamp);
        emit PassUpdated(tokenId, tier, trustScore);
    }

    /// @notice Tier of the best pass held by `holder` (0 = none). Handy for on-chain gating.
    function tierOfHolder(address holder) external view returns (uint8 best) {
        uint256 n = balanceOf(holder);
        for (uint256 i = 0; i < n && i < 20; i++) {
            uint8 t = passes[tokenOfOwnerByIndex(holder, i)].tier;
            if (t > best) best = t;
        }
    }

    function setMinter(address m) external onlyOwner {
        minter = m;
        emit MinterChanged(m);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
        emit BaseURIChanged(baseURI_);
    }

    /// @dev `<baseURI><certified token address, lowercase hex>`; the API resolves it by token address.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_baseTokenURI, Strings.toHexString(passes[tokenId].certifiedToken));
    }

    function _checkTier(uint8 tier, uint8 trustScore) private pure {
        if (tier < BRONZE || tier > LEGENDARY) revert BadTier();
        if (trustScore > 100) revert BadScore();
    }
}
