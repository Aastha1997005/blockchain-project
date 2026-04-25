// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Identity {
    address public admin;

    // Mappings to track statuses and data
    mapping(address => bool) public isVerifier;
    mapping(address => string) public userIdentities; // Stores the hash of the user's documents
    mapping(address => string) public userStatus;     // Can be: "None", "Pending", "Verified", "Revoked"

    // Events (These allow your frontend to listen for changes immediately)
    event UserRegistered(address indexed user, string dataHash);
    event UserVerified(address indexed user);
    event UserRevoked(address indexed user);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    // Security Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Access Denied: Only admin can perform this action");
        _;
    }

    modifier onlyVerifier() {
        require(isVerifier[msg.sender] || msg.sender == admin, "Access Denied: Only verifiers can perform this action");
        _;
    }

    // Constructor runs once when the contract is deployed
    constructor() {
        admin = msg.sender; // The wallet that deploys this becomes the master Admin
    }

    // --- ADMIN FUNCTIONS ---
    function addVerifier(address _verifier) public onlyAdmin {
        isVerifier[_verifier] = true;
        emit VerifierAdded(_verifier);
    }

    function removeVerifier(address _verifier) public onlyAdmin {
        isVerifier[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }

    // --- USER FUNCTIONS ---
    function registerIdentity(string memory _dataHash) public {
        // Ensure they aren't already registered or pending
        require(bytes(userStatus[msg.sender]).length == 0 || keccak256(bytes(userStatus[msg.sender])) == keccak256(bytes("None")), "Already registered or pending");
        
        userIdentities[msg.sender] = _dataHash;
        userStatus[msg.sender] = "Pending";
        emit UserRegistered(msg.sender, _dataHash);
    }

    // --- VERIFIER FUNCTIONS ---
    function approveUser(address _user) public onlyVerifier {
        require(keccak256(bytes(userStatus[_user])) == keccak256(bytes("Pending")), "User is not currently pending");
        userStatus[_user] = "Verified";
        emit UserVerified(_user);
    }

    function revokeUser(address _user) public onlyVerifier {
        userStatus[_user] = "Revoked";
        emit UserRevoked(_user);
    }

    // --- UTILITY/AUCTION FUNCTION ---
    function checkIsVerified(address _user) public view returns (bool) {
        return keccak256(bytes(userStatus[_user])) == keccak256(bytes("Verified"));
    }
}