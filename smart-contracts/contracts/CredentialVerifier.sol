// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CredentialVerifier
 * @dev Manages verification requests and shares for credentials with privacy controls
 */
contract CredentialVerifier is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    uint256 private _shareIdCounter = 0;
    uint256 private _verificationRequestIdCounter = 0;

    enum ShareType {
        TEMPORARY,      // Time-limited share
        PERMANENT,      // Permanent share
        REVOKED         // Revoked share
    }

    enum VerificationStatus {
        PENDING,
        VERIFIED,
        FAILED,
        EXPIRED
    }

    // Share link structure for controlled access
    struct CredentialShare {
        uint256 shareId;
        address credentialHolder;
        address sharedWith;        // Address of verifier/institution
        bytes32 credentialHash;
        ShareType shareType;
        uint256 createdAt;
        uint256 expiryDate;        // 0 if permanent
        bool isActive;
        string shareReason;        // e.g., "Job Application", "Academic Admission"
    }

    // Verification request structure
    struct VerificationRequest {
        uint256 requestId;
        address requester;         // Institution/Employer requesting verification
        address credentialHolder;
        bytes32 credentialHash;
        VerificationStatus status;
        uint256 createdAt;
        uint256 verifiedAt;
        string purpose;
        bool accepted;
    }

    // Access logs for audit trail
    struct AccessLog {
        address accessor;
        bytes32 credentialHash;
        uint256 timestamp;
        string action;             // "VERIFIED", "VIEWED", "REQUESTED"
    }

    mapping(uint256 => CredentialShare) public credentialShares;
    mapping(uint256 => VerificationRequest) public verificationRequests;
    mapping(bytes32 => AccessLog[]) public accessLogs;
    mapping(address => uint256[]) public userShares;
    mapping(address => uint256[]) public userVerificationRequests;

    event CredentialShared(
        uint256 indexed shareId,
        address indexed holder,
        address indexed verifier,
        bytes32 credentialHash,
        ShareType shareType,
        uint256 expiryDate
    );

    event ShareRevoked(uint256 indexed shareId, address indexed holder);
    event VerificationRequested(uint256 indexed requestId, address indexed requester, bytes32 credentialHash);
    event VerificationCompleted(uint256 indexed requestId, VerificationStatus status, bool isValid);
    event AccessLogged(bytes32 indexed credentialHash, address indexed accessor, string action);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register a verifier (employer, recruiter, institution)
     * @param _verifierAddress Address of the verifier
     * @param _verifierName Name of the verifying institution
     */
    function registerVerifier(address _verifierAddress, string memory _verifierName) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_verifierAddress != address(0), "Invalid verifier address");
        grantRole(VERIFIER_ROLE, _verifierAddress);
    }

    /**
     * @dev Share a credential with a verifier
     * @param _sharedWith Address of the verifier
     * @param _credentialHash Hash of the credential to share
     * @param _shareType Type of share (temporary or permanent)
     * @param _expiryDays Number of days until share expires (0 for permanent)
     * @param _shareReason Reason for sharing
     */
    function shareCredential(
        address _sharedWith,
        bytes32 _credentialHash,
        ShareType _shareType,
        uint256 _expiryDays,
        string memory _shareReason
    ) 
        public 
        returns (uint256) 
    {
        require(_sharedWith != address(0), "Invalid recipient address");
        require(_shareType != ShareType.REVOKED, "Cannot create revoked share");

        uint256 shareId = _shareIdCounter;
        _shareIdCounter++;

        uint256 expiryDate = 0;
        if (_shareType == ShareType.TEMPORARY) {
            require(_expiryDays > 0, "Expiry days must be positive for temporary share");
            expiryDate = block.timestamp + (_expiryDays * 1 days);
        }

        credentialShares[shareId] = CredentialShare({
            shareId: shareId,
            credentialHolder: msg.sender,
            sharedWith: _sharedWith,
            credentialHash: _credentialHash,
            shareType: _shareType,
            createdAt: block.timestamp,
            expiryDate: expiryDate,
            isActive: true,
            shareReason: _shareReason
        });

        userShares[msg.sender].push(shareId);

        emit CredentialShared(
            shareId,
            msg.sender,
            _sharedWith,
            _credentialHash,
            _shareType,
            expiryDate
        );

        _logAccess(_credentialHash, msg.sender, "SHARED");

        return shareId;
    }

    /**
     * @dev Revoke a credential share
     * @param _shareId ID of the share to revoke
     */
    function revokeShare(uint256 _shareId) 
        public 
    {
        CredentialShare storage share = credentialShares[_shareId];
        require(share.credentialHolder == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
                "Not authorized to revoke this share");
        require(share.isActive, "Share is already inactive");

        share.isActive = false;
        share.shareType = ShareType.REVOKED;

        emit ShareRevoked(_shareId, msg.sender);
    }

    /**
     * @dev Request verification of a credential
     * @param _credentialHolder Address of the credential holder
     * @param _credentialHash Hash of the credential
     * @param _purpose Purpose of verification
     */
    function requestVerification(
        address _credentialHolder,
        bytes32 _credentialHash,
        string memory _purpose
    ) 
        public 
        onlyRole(VERIFIER_ROLE) 
        returns (uint256) 
    {
        require(_credentialHolder != address(0), "Invalid holder address");

        uint256 requestId = _verificationRequestIdCounter;
        _verificationRequestIdCounter++;

        verificationRequests[requestId] = VerificationRequest({
            requestId: requestId,
            requester: msg.sender,
            credentialHolder: _credentialHolder,
            credentialHash: _credentialHash,
            status: VerificationStatus.PENDING,
            createdAt: block.timestamp,
            verifiedAt: 0,
            purpose: _purpose,
            accepted: false
        });

        userVerificationRequests[_credentialHolder].push(requestId);

        emit VerificationRequested(requestId, msg.sender, _credentialHash);
        _logAccess(_credentialHash, msg.sender, "REQUESTED");

        return requestId;
    }

    /**
     * @dev Verify a credential (called after holder approval)
     * @param _requestId ID of the verification request
     * @param _isValid Whether the credential is valid and authentic
     */
    function completeVerification(uint256 _requestId, bool _isValid) 
        public 
        onlyRole(VERIFIER_ROLE) 
    {
        VerificationRequest storage request = verificationRequests[_requestId];
        require(request.requester == msg.sender, "Not the requesting verifier");
        require(request.status == VerificationStatus.PENDING, "Request already processed");

        request.status = _isValid ? VerificationStatus.VERIFIED : VerificationStatus.FAILED;
        request.verifiedAt = block.timestamp;

        emit VerificationCompleted(_requestId, request.status, _isValid);
        _logAccess(request.credentialHash, msg.sender, _isValid ? "VERIFIED" : "FAILED");
    }

    /**
     * @dev Get verification request details
     * @param _requestId ID of the request
     */
    function getVerificationRequest(uint256 _requestId) 
        public 
        view 
        returns (VerificationRequest memory) 
    {
        return verificationRequests[_requestId];
    }

    /**
     * @dev Get credential share details
     * @param _shareId ID of the share
     */
    function getCredentialShare(uint256 _shareId) 
        public 
        view 
        returns (CredentialShare memory) 
    {
        return credentialShares[_shareId];
    }

    /**
     * @dev Check if a share is active and not expired
     * @param _shareId ID of the share
     */
    function isShareActive(uint256 _shareId) 
        public 
        view 
        returns (bool) 
    {
        CredentialShare storage share = credentialShares[_shareId];
        if (!share.isActive) {
            return false;
        }

        if (share.expiryDate > 0 && block.timestamp > share.expiryDate) {
            return false;
        }

        return true;
    }

    /**
     * @dev Get access logs for a credential
     * @param _credentialHash Hash of the credential
     */
    function getAccessLogs(bytes32 _credentialHash) 
        public 
        view 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        returns (AccessLog[] memory) 
    {
        return accessLogs[_credentialHash];
    }

    /**
     * @dev Get user's shares
     * @param _user Address of the user
     */
    function getUserShares(address _user) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return userShares[_user];
    }

    /**
     * @dev Get user's verification requests
     * @param _user Address of the user
     */
    function getUserVerificationRequests(address _user) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return userVerificationRequests[_user];
    }

    /**
     * @dev Internal function to log access to credentials (audit trail)
     */
    function _logAccess(bytes32 _credentialHash, address _accessor, string memory _action) 
        internal 
    {
        accessLogs[_credentialHash].push(AccessLog({
            accessor: _accessor,
            credentialHash: _credentialHash,
            timestamp: block.timestamp,
            action: _action
        }));

        emit AccessLogged(_credentialHash, _accessor, _action);
    }
}
