// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract DiplomaRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE   = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant MINISTRY_ROLE = keccak256("MINISTRY_ROLE");

    uint256 private _credentialIdCounter = 0;

    enum CredentialType {
        DIPLOMA,
        CERTIFICATE,
        LICENSE,
        TRANSCRIPT,
        TRAINING
    }

    enum CredentialStatus {
        PENDING,    // 0 — émis par l'université, en attente d'approbation ministère
        ISSUED,     // 1 — approuvé par le ministère, valide
        SUSPENDED,  // 2 — suspendu temporairement
        REVOKED,    // 3 — révoqué définitivement
        REJECTED    // 4 — rejeté par le ministère
    }

    struct Credential {
        uint256 id;
        address issuer;
        address holder;
        string holderName;
        string credentialURI;
        string credentialMetadataURI;
        bytes32 credentialHash;
        CredentialType credentialType;
        CredentialStatus status;
        uint256 issueDate;
        uint256 expiryDate;
        string institutionName;
        string fieldOfStudy;
    }

    mapping(uint256 => Credential) public credentials;
    mapping(bytes32 => uint256)    public hashToCredentialId;
    mapping(bytes32 => bool)       public credentialHashExists;
    mapping(address => uint256[])  public holderCredentials;
    mapping(address => bool)       public authorizedIssuers;
    mapping(address => string)     public issuerNames;
    address[]                      public issuersList;

    event CredentialIssued(uint256 indexed credentialId, address indexed issuer, address indexed holder, string holderName, bytes32 credentialHash, uint256 issueDate);
    event CredentialApproved(uint256 indexed credentialId);
    event CredentialRejected(uint256 indexed credentialId, string reason);
    event CredentialRevoked(uint256 indexed credentialId, string reason);
    event CredentialSuspended(uint256 indexed credentialId, string reason);
    event CredentialReactivated(uint256 indexed credentialId);
    event IssuerAuthorized(address indexed issuer, string institutionName);
    event IssuerRemovedFromRegistry(address indexed issuer);

    constructor(address _ministryAddress) {
        require(_ministryAddress != address(0), "Invalid ministry address");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINISTRY_ROLE, _ministryAddress);
    }

    // ─── Gestion des universités (Ministère) ──────────────────────────────────

    function authorizeIssuer(address _issuer, string memory _institutionName)
        public
        onlyRole(MINISTRY_ROLE)
    {
        require(_issuer != address(0), "Invalid issuer address");
        if (!authorizedIssuers[_issuer]) {
            issuersList.push(_issuer);
        }
        _grantRole(ISSUER_ROLE, _issuer);
        authorizedIssuers[_issuer] = true;
        issuerNames[_issuer] = _institutionName;
        emit IssuerAuthorized(_issuer, _institutionName);
    }

    function removeIssuer(address _issuer)
        public
        onlyRole(MINISTRY_ROLE)
    {
        require(_issuer != address(0), "Invalid issuer address");
        _revokeRole(ISSUER_ROLE, _issuer);
        authorizedIssuers[_issuer] = false;
        emit IssuerRemovedFromRegistry(_issuer);
    }

    function getAllIssuers() public view returns (address[] memory) {
        return issuersList;
    }

    // ─── Émission (Université) ────────────────────────────────────────────────

    function issueCredential(
        address _holder,
        string memory _holderName,
        string memory _credentialURI,
        string memory _credentialMetadataURI,
        bytes32 _credentialHash,
        CredentialType _credentialType,
        uint256 _expiryDate,
        string memory _institutionName,
        string memory _fieldOfStudy
    )
        public
        onlyRole(ISSUER_ROLE)
        returns (uint256)
    {
        require(_holder != address(0), "Invalid holder address");
        require(_expiryDate == 0 || _expiryDate > block.timestamp, "Invalid expiry date");
        require(!credentialHashExists[_credentialHash], "Credential already exists");

        uint256 credentialId = _credentialIdCounter++;

        Credential storage credential = credentials[credentialId];
        credential.id                   = credentialId;
        credential.issuer               = msg.sender;
        credential.holder               = _holder;
        credential.holderName           = _holderName;
        credential.credentialURI        = _credentialURI;
        credential.credentialMetadataURI = _credentialMetadataURI;
        credential.credentialHash       = _credentialHash;
        credential.credentialType       = _credentialType;
        credential.status               = CredentialStatus.PENDING;
        credential.issueDate            = block.timestamp;
        credential.expiryDate           = _expiryDate;
        credential.institutionName      = _institutionName;
        credential.fieldOfStudy         = _fieldOfStudy;

        hashToCredentialId[_credentialHash]  = credentialId;
        credentialHashExists[_credentialHash] = true;
        holderCredentials[_holder].push(credentialId);

        emit CredentialIssued(credentialId, msg.sender, _holder, _holderName, _credentialHash, block.timestamp);
        return credentialId;
    }

    // ─── Approbation / Rejet (Ministère) ─────────────────────────────────────

    function approveCredential(uint256 _credentialId)
        public
        onlyRole(MINISTRY_ROLE)
    {
        require(_credentialId < _credentialIdCounter, "Credential does not exist");
        Credential storage credential = credentials[_credentialId];
        require(credential.status == CredentialStatus.PENDING, "Credential is not pending");
        credential.status = CredentialStatus.ISSUED;
        emit CredentialApproved(_credentialId);
    }

    function rejectCredential(uint256 _credentialId, string memory _reason)
        public
        onlyRole(MINISTRY_ROLE)
    {
        require(_credentialId < _credentialIdCounter, "Credential does not exist");
        Credential storage credential = credentials[_credentialId];
        require(credential.status == CredentialStatus.PENDING, "Credential is not pending");
        credential.status = CredentialStatus.REJECTED;
        emit CredentialRejected(_credentialId, _reason);
    }

    // ─── Suspension / Révocation / Réactivation (Université ou Ministère) ────

    function revokeCredential(uint256 _credentialId, string memory _reason)
        public
    {
        require(_credentialId < _credentialIdCounter, "Credential does not exist");
        Credential storage credential = credentials[_credentialId];
        require(
            credential.issuer == msg.sender ||
            hasRole(MINISTRY_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        credential.status = CredentialStatus.REVOKED;
        emit CredentialRevoked(_credentialId, _reason);
    }

    function suspendCredential(uint256 _credentialId, string memory _reason)
        public
    {
        require(_credentialId < _credentialIdCounter, "Credential does not exist");
        Credential storage credential = credentials[_credentialId];
        require(
            credential.issuer == msg.sender ||
            hasRole(MINISTRY_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        credential.status = CredentialStatus.SUSPENDED;
        emit CredentialSuspended(_credentialId, _reason);
    }

    function reactivateCredential(uint256 _credentialId)
        public
    {
        require(_credentialId < _credentialIdCounter, "Credential does not exist");
        Credential storage credential = credentials[_credentialId];
        require(
            credential.issuer == msg.sender ||
            hasRole(MINISTRY_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(credential.status == CredentialStatus.SUSPENDED, "Credential is not suspended");
        credential.status = CredentialStatus.ISSUED;
        emit CredentialReactivated(_credentialId);
    }

    // ─── Vérification ─────────────────────────────────────────────────────────

    function verifyCredentialByHash(bytes32 _credentialHash)
        public
        view
        returns (bool isValid, Credential memory credentialData)
    {
        require(credentialHashExists[_credentialHash], "Credential not found");
        uint256 credentialId = hashToCredentialId[_credentialHash];
        Credential storage credential = credentials[credentialId];
        bool valid = credential.status == CredentialStatus.ISSUED &&
                     (credential.expiryDate == 0 || credential.expiryDate > block.timestamp);
        return (valid, credential);
    }

    function verifyCredentialById(uint256 _credentialId)
        public
        view
        returns (bool isValid, Credential memory credentialData)
    {
        require(_credentialId < _credentialIdCounter, "Credential does not exist");
        Credential storage credential = credentials[_credentialId];
        bool valid = credential.status == CredentialStatus.ISSUED &&
                     (credential.expiryDate == 0 || credential.expiryDate > block.timestamp);
        return (valid, credential);
    }

    // ─── Lecture ──────────────────────────────────────────────────────────────

    function getHolderCredentials(address _holder) public view returns (uint256[] memory) {
        return holderCredentials[_holder];
    }

    function getCredential(uint256 _credentialId) public view returns (Credential memory) {
        require(_credentialId < _credentialIdCounter, "Credential does not exist");
        return credentials[_credentialId];
    }

    function isCredentialExpired(uint256 _credentialId) public view returns (bool) {
        require(_credentialId < _credentialIdCounter, "Credential does not exist");
        Credential storage credential = credentials[_credentialId];
        return credential.expiryDate != 0 && credential.expiryDate < block.timestamp;
    }

    function getTotalCredentialsCount() public view returns (uint256) {
        return _credentialIdCounter;
    }
}
