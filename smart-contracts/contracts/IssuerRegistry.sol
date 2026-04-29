// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title IssuerRegistry
 * @dev Manages the registration and verification of authorized credential issuers
 */
contract IssuerRegistry is AccessControl {
    
    enum IssuerType {
        UNIVERSITY,
        GREAT_SCHOOL,
        PROFESSIONAL_ORDER,
        MINISTRY,
        TRAINING_CENTER
    }

    enum IssuerStatus {
        ACTIVE,
        SUSPENDED,
        REVOKED
    }

    struct Issuer {
        address issuerAddress;
        string institutionName;
        string institutionEmail;
        string institutionWebsite;
        string country;
        IssuerType issuerType;
        IssuerStatus status;
        uint256 registrationDate;
        string verificationDocumentURI;  // IPFS hash of verification documents
    }

    mapping(address => Issuer) public registeredIssuers;
    mapping(string => address) public institutionNameToAddress; // For lookup by name
    address[] public issuersList;

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    event IssuerRegistered(
        address indexed issuerAddress,
        string institutionName,
        IssuerType issuerType,
        uint256 registrationDate
    );

    event IssuerStatusChanged(address indexed issuerAddress, IssuerStatus newStatus, string reason);
    event IssuerDetailsUpdated(address indexed issuerAddress, string field);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    /**
     * @dev Register a new issuer
     * @param _issuerAddress Address of the issuer
     * @param _institutionName Name of the institution
     * @param _institutionEmail Email of the institution
     * @param _institutionWebsite Website URL
     * @param _country Country of operation
     * @param _issuerType Type of issuer
     * @param _verificationDocumentURI IPFS hash of verification documents
     */
    function registerIssuer(
        address _issuerAddress,
        string memory _institutionName,
        string memory _institutionEmail,
        string memory _institutionWebsite,
        string memory _country,
        IssuerType _issuerType,
        string memory _verificationDocumentURI
    ) 
        public 
        onlyRole(REGISTRAR_ROLE) 
        returns (bool) 
    {
        require(_issuerAddress != address(0), "Invalid issuer address");
        require(registeredIssuers[_issuerAddress].issuerAddress == address(0), "Issuer already registered");
        require(bytes(_institutionName).length > 0, "Institution name required");

        registeredIssuers[_issuerAddress] = Issuer({
            issuerAddress: _issuerAddress,
            institutionName: _institutionName,
            institutionEmail: _institutionEmail,
            institutionWebsite: _institutionWebsite,
            country: _country,
            issuerType: _issuerType,
            status: IssuerStatus.ACTIVE,
            registrationDate: block.timestamp,
            verificationDocumentURI: _verificationDocumentURI
        });

        institutionNameToAddress[_institutionName] = _issuerAddress;
        issuersList.push(_issuerAddress);

        emit IssuerRegistered(
            _issuerAddress,
            _institutionName,
            _issuerType,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Suspend an issuer's credentials
     * @param _issuerAddress Address of the issuer
     * @param _reason Reason for suspension
     */
    function suspendIssuer(address _issuerAddress, string memory _reason) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(registeredIssuers[_issuerAddress].issuerAddress != address(0), "Issuer not found");
        registeredIssuers[_issuerAddress].status = IssuerStatus.SUSPENDED;
        emit IssuerStatusChanged(_issuerAddress, IssuerStatus.SUSPENDED, _reason);
    }

    /**
     * @dev Revoke an issuer's credentials permanently
     * @param _issuerAddress Address of the issuer
     * @param _reason Reason for revocation
     */
    function revokeIssuer(address _issuerAddress, string memory _reason) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(registeredIssuers[_issuerAddress].issuerAddress != address(0), "Issuer not found");
        registeredIssuers[_issuerAddress].status = IssuerStatus.REVOKED;
        emit IssuerStatusChanged(_issuerAddress, IssuerStatus.REVOKED, _reason);
    }

    /**
     * @dev Reactivate an issuer
     * @param _issuerAddress Address of the issuer
     */
    function reactivateIssuer(address _issuerAddress) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(registeredIssuers[_issuerAddress].issuerAddress != address(0), "Issuer not found");
        registeredIssuers[_issuerAddress].status = IssuerStatus.ACTIVE;
        emit IssuerStatusChanged(_issuerAddress, IssuerStatus.ACTIVE, "Reactivated");
    }

    /**
     * @dev Check if an issuer is active
     * @param _issuerAddress Address to check
     * @return True if issuer is active
     */
    function isIssuerActive(address _issuerAddress) 
        public 
        view 
        returns (bool) 
    {
        Issuer storage issuer = registeredIssuers[_issuerAddress];
        return issuer.issuerAddress != address(0) && issuer.status == IssuerStatus.ACTIVE;
    }

    /**
     * @dev Get issuer details by address
     * @param _issuerAddress Address of the issuer
     * @return Issuer details
     */
    function getIssuerDetails(address _issuerAddress) 
        public 
        view 
        returns (Issuer memory) 
    {
        require(registeredIssuers[_issuerAddress].issuerAddress != address(0), "Issuer not found");
        return registeredIssuers[_issuerAddress];
    }

    /**
     * @dev Get issuer address by institution name
     * @param _institutionName Name of the institution
     * @return Address of the issuer
     */
    function getIssuerByName(string memory _institutionName) 
        public 
        view 
        returns (address) 
    {
        return institutionNameToAddress[_institutionName];
    }

    /**
     * @dev Get total number of registered issuers
     * @return Count of issuers
     */
    function getTotalIssuersCount() 
        public 
        view 
        returns (uint256) 
    {
        return issuersList.length;
    }

    /**
     * @dev Get all registered issuers
     * @return Array of issuer addresses
     */
    function getAllIssuers() 
        public 
        view 
        returns (address[] memory) 
    {
        return issuersList;
    }

    /**
     * @dev Update issuer details (name and website)
     * @param _issuerAddress Address of issuer to update
     * @param _institutionName New institution name
     * @param _institutionWebsite New website
     */
    function updateIssuerDetails(
        address _issuerAddress,
        string memory _institutionName,
        string memory _institutionWebsite
    ) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(registeredIssuers[_issuerAddress].issuerAddress != address(0), "Issuer not found");
        
        registeredIssuers[_issuerAddress].institutionName = _institutionName;
        registeredIssuers[_issuerAddress].institutionWebsite = _institutionWebsite;
        
        emit IssuerDetailsUpdated(_issuerAddress, "name and website");
    }
}
