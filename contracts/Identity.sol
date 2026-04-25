// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract IdentityVerifier is AccessControl {

    //  Roles
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    //  Limits
    uint256 public constant MAX_REQUESTS = 4;

    //  Status
    enum Status { None, Verified, Revoked }

    //  Identity Structure
    struct Identity {
        bytes32 identityHash;
        Status status;
        address verifiedBy;
        uint256 timestamp;
    }

    //  Storage
    mapping(address => Identity) private identities;
    mapping(bytes32 => bool) public usedHashes;
    mapping(address => uint256) public requestCount;

    //  Events
    event IdentityVerified(address indexed user, bytes32 hash, address verifier);
    event IdentityRevoked(address indexed user, address revokedBy);

    //  Errors
    error AlreadyVerified();
    error NotVerified();
    error InvalidHash();
    error HashAlreadyUsed();
    error MaxRequestsReached();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    //  Verifier writes verified identity ON-CHAIN
    function verifyIdentity(
        address user,
        bytes32 identityHash
    ) external onlyRole(VERIFIER_ROLE) {

        require(user != address(0), "Invalid user");

        if (requestCount[user] >= MAX_REQUESTS) revert MaxRequestsReached();
        if (identityHash == bytes32(0)) revert InvalidHash();
        if (usedHashes[identityHash]) revert HashAlreadyUsed();

        //  Release old hash if overwriting
        if (identities[user].status == Status.Verified) {
            bytes32 oldHash = identities[user].identityHash;
            usedHashes[oldHash] = false;
        }

        //  Increment request count
        requestCount[user]++;

        identities[user] = Identity({
            identityHash: identityHash,
            status: Status.Verified,
            verifiedBy: msg.sender,
            timestamp: block.timestamp
        });

        usedHashes[identityHash] = true;

        emit IdentityVerified(user, identityHash, msg.sender);
    }

    //  User revokes their identity
    function revokeMyIdentity() external {
        if (identities[msg.sender].status != Status.Verified) {
            revert NotVerified();
        }

        bytes32 oldHash = identities[msg.sender].identityHash;

        identities[msg.sender].status = Status.Revoked;

        usedHashes[oldHash] = false;

        //  OPTIONAL (recommended for real-world)
        // Reset count so user can re-verify again in future
        requestCount[msg.sender] = 0;

        emit IdentityRevoked(msg.sender, msg.sender);
    }

    //  Public verification check
    function isVerified(address user) public view returns (bool) {
        return identities[user].status == Status.Verified;
    }

    //  Get identity by address
    function getIdentity(address user)
        external
        view
        returns (
            bytes32 identityHash,
            Status status,
            address verifiedBy,
            uint256 timestamp
        )
    {
        Identity memory id = identities[user];
        return (
            id.identityHash,
            id.status,
            id.verifiedBy,
            id.timestamp
        );
    }

    //  Get caller’s identity
    function getMyIdentity()
        external
        view
        returns (
            bytes32 identityHash,
            Status status,
            address verifiedBy,
            uint256 timestamp
        )
    {
        Identity memory id = identities[msg.sender];
        return (
            id.identityHash,
            id.status,
            id.verifiedBy,
            id.timestamp
        );
    }
}