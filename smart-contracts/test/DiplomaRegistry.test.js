const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Diploma Verification System", function () {
  let diplomaRegistry,
    issuerRegistry,
    credentialVerifier,
    admin,
    issuer1,
    issuer2,
    verifier1,
    holder1;

  beforeEach(async function () {
    [admin, issuer1, issuer2, verifier1, holder1] = await ethers.getSigners();

    // Deploy contracts
    const DiplomaRegistry = await ethers.getContractFactory("DiplomaRegistry");
    diplomaRegistry = await DiplomaRegistry.deploy();
    await diplomaRegistry.waitForDeployment();

    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    issuerRegistry = await IssuerRegistry.deploy();
    await issuerRegistry.waitForDeployment();

    const CredentialVerifier = await ethers.getContractFactory(
      "CredentialVerifier"
    );
    credentialVerifier = await CredentialVerifier.deploy();
    await credentialVerifier.waitForDeployment();
  });

  describe("DiplomaRegistry", function () {
    describe("Issuer Management", function () {
      it("should authorize an issuer", async function () {
        await diplomaRegistry.authorizeIssuer(
          issuer1.address,
          "University of Paris"
        );
        expect(
          await diplomaRegistry.hasRole(
            await diplomaRegistry.ISSUER_ROLE(),
            issuer1.address
          )
        ).to.be.true;
      });

      it("should remove an issuer", async function () {
        await diplomaRegistry.authorizeIssuer(
          issuer1.address,
          "University of Paris"
        );
        await diplomaRegistry.removeIssuer(issuer1.address);
        expect(
          await diplomaRegistry.hasRole(
            await diplomaRegistry.ISSUER_ROLE(),
            issuer1.address
          )
        ).to.be.false;
      });

      it("should prevent non-admin from authorizing issuers", async function () {
        await expect(
          diplomaRegistry
            .connect(issuer1)
            .authorizeIssuer(issuer2.address, "Another University")
        ).to.be.reverted;
      });
    });

    describe("Credential Issuance", function () {
      beforeEach(async function () {
        await diplomaRegistry.authorizeIssuer(
          issuer1.address,
          "University of Paris"
        );
      });

      it("should issue a credential", async function () {
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("diploma123")
        );

        const tx = await diplomaRegistry
          .connect(issuer1)
          .issueCredential(
            holder1.address,
            "John Doe",
            "QmDiplomaHash123",
            "QmMetadata123",
            credentialHash,
            0, // DIPLOMA type
            0, // No expiry
            "University of Paris",
            "Computer Science"
          );

        const receipt = await tx.wait();
        expect(receipt.logs).to.have.length.above(0);

        const credential = await diplomaRegistry.getCredential(0);
        expect(credential.holder).to.equal(holder1.address);
        expect(credential.holderName).to.equal("John Doe");
        expect(credential.institutionName).to.equal("University of Paris");
      });

      it("should not allow unauthorized issuers to issue credentials", async function () {
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("diploma456")
        );

        await expect(
          diplomaRegistry
            .connect(holder1)
            .issueCredential(
              holder1.address,
              "Jane Doe",
              "QmHash",
              "QmMeta",
              credentialHash,
              0,
              0,
              "University",
              "Engineering"
            )
        ).to.be.reverted;
      });

      it("should not allow duplicate credentials", async function () {
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("diploma789")
        );

        await diplomaRegistry
          .connect(issuer1)
          .issueCredential(
            holder1.address,
            "John Doe",
            "QmHash1",
            "QmMeta1",
            credentialHash,
            0,
            0,
            "University",
            "Science"
          );

        await expect(
          diplomaRegistry
            .connect(issuer1)
            .issueCredential(
              holder1.address,
              "Jane Doe",
              "QmHash2",
              "QmMeta2",
              credentialHash,
              0,
              0,
              "University",
              "Arts"
            )
        ).to.be.revertedWith("Credential already exists");
      });
    });

    describe("Credential Verification", function () {
      let credentialHash;

      beforeEach(async function () {
        await diplomaRegistry.authorizeIssuer(
          issuer1.address,
          "University of Paris"
        );

        credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("diploTest")
        );

        await diplomaRegistry
          .connect(issuer1)
          .issueCredential(
            holder1.address,
            "Alice Smith",
            "QmTest123",
            "QmTestMeta",
            credentialHash,
            0,
            0,
            "University of Paris",
            "Mathematics"
          );
      });

      it("should verify a valid credential", async function () {
        const [isValid, credential] =
          await diplomaRegistry.verifyCredentialByHash(credentialHash);

        expect(isValid).to.be.true;
        expect(credential.holderName).to.equal("Alice Smith");
      });

      it("should return invalid status for revoked credential", async function () {
        await diplomaRegistry
          .connect(issuer1)
          .revokeCredential(0, "Academic misconduct");

        const [isValid] =
          await diplomaRegistry.verifyCredentialByHash(credentialHash);
        expect(isValid).to.be.false;
      });

      it("should revoke a credential", async function () {
        await diplomaRegistry
          .connect(issuer1)
          .revokeCredential(0, "Test revocation");

        const credential = await diplomaRegistry.getCredential(0);
        expect(credential.status).to.equal(2); // REVOKED status
      });
    });

    describe("Credential Suspension", function () {
      let credentialId = 0;

      beforeEach(async function () {
        await diplomaRegistry.authorizeIssuer(
          issuer1.address,
          "University of Paris"
        );

        await diplomaRegistry
          .connect(issuer1)
          .issueCredential(
            holder1.address,
            "Test User",
            "QmTest",
            "QmMeta",
            ethers.keccak256(ethers.toUtf8Bytes("suspend-test")),
            0,
            0,
            "University",
            "Subject"
          );
      });

      it("should suspend a credential", async function () {
        await diplomaRegistry
          .connect(issuer1)
          .suspendCredential(credentialId, "Under investigation");

        const credential = await diplomaRegistry.getCredential(credentialId);
        expect(credential.status).to.equal(1); // SUSPENDED
      });

      it("should reactivate a suspended credential", async function () {
        await diplomaRegistry
          .connect(issuer1)
          .suspendCredential(credentialId, "Test suspend");

        await diplomaRegistry
          .connect(issuer1)
          .reactivateCredential(credentialId);

        const credential = await diplomaRegistry.getCredential(credentialId);
        expect(credential.status).to.equal(0); // ISSUED
      });
    });

    describe("Expiry Handling", function () {
      it("should mark credential as expired", async function () {
        await diplomaRegistry.authorizeIssuer(
          issuer1.address,
          "University of Paris"
        );

        // Use blockchain timestamp to avoid race conditions
        const latestBlock = await ethers.provider.getBlock("latest");
        const expiryTime = latestBlock.timestamp + 10; // 10 seconds in blockchain time

        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("expiry-test")
        );

        await diplomaRegistry
          .connect(issuer1)
          .issueCredential(
            holder1.address,
            "Test User",
            "QmHash",
            "QmMeta",
            credentialHash,
            0,
            expiryTime,
            "University",
            "Subject"
          );

        // Advance blockchain time by 20 seconds, then mine a block
        await ethers.provider.send("evm_increaseTime", [20]);
        await ethers.provider.send("evm_mine", []);

        const isExpired = await diplomaRegistry.isCredentialExpired(0);
        expect(isExpired).to.be.true;
      });
    });
  });

  describe("IssuerRegistry", function () {
    describe("Issuer Registration", function () {
      it("should register an issuer", async function () {
        const tx = await issuerRegistry.registerIssuer(
          issuer1.address,
          "Paris University",
          "registry@paris.edu",
          "https://paris.edu",
          "France",
          0, // UNIVERSITY
          "QmVerification123"
        );

        expect(tx).to.emit(issuerRegistry, "IssuerRegistered");

        const issuer = await issuerRegistry.getIssuerDetails(issuer1.address);
        expect(issuer.institutionName).to.equal("Paris University");
        expect(issuer.status).to.equal(0); // ACTIVE
      });

      it("should prevent duplicate issuer registration", async function () {
        await issuerRegistry.registerIssuer(
          issuer1.address,
          "Paris University",
          "registry@paris.edu",
          "https://paris.edu",
          "France",
          0,
          "QmHash"
        );

        await expect(
          issuerRegistry.registerIssuer(
            issuer1.address,
            "Another Name",
            "email@test.com",
            "https://test.com",
            "France",
            0,
            "QmHash"
          )
        ).to.be.revertedWith("Issuer already registered");
      });

      it("should get issuer by name", async function () {
        await issuerRegistry.registerIssuer(
          issuer1.address,
          "Tech University",
          "registry@tech.edu",
          "https://tech.edu",
          "France",
          0,
          "QmHash"
        );

        const address = await issuerRegistry.getIssuerByName("Tech University");
        expect(address).to.equal(issuer1.address);
      });
    });

    describe("Issuer Status Management", function () {
      beforeEach(async function () {
        await issuerRegistry.registerIssuer(
          issuer1.address,
          "Test University",
          "registry@test.edu",
          "https://test.edu",
          "France",
          0,
          "QmHash"
        );
      });

      it("should suspend an issuer", async function () {
        await issuerRegistry.suspendIssuer(issuer1.address, "Under review");

        const issuer = await issuerRegistry.getIssuerDetails(issuer1.address);
        expect(issuer.status).to.equal(1); // SUSPENDED
      });

      it("should revoke an issuer", async function () {
        await issuerRegistry.revokeIssuer(issuer1.address, "License revoked");

        const issuer = await issuerRegistry.getIssuerDetails(issuer1.address);
        expect(issuer.status).to.equal(2); // REVOKED
      });

      it("should check if issuer is active", async function () {
        expect(await issuerRegistry.isIssuerActive(issuer1.address)).to.be
          .true;

        await issuerRegistry.suspendIssuer(issuer1.address, "Test");

        expect(await issuerRegistry.isIssuerActive(issuer1.address)).to.be
          .false;
      });

      it("should reactivate an issuer", async function () {
        await issuerRegistry.suspendIssuer(issuer1.address, "Test");
        await issuerRegistry.reactivateIssuer(issuer1.address);

        expect(await issuerRegistry.isIssuerActive(issuer1.address)).to.be
          .true;
      });
    });
  });

  describe("CredentialVerifier", function () {
    beforeEach(async function () {
      // Register verifier
      await credentialVerifier.registerVerifier(
        verifier1.address,
        "Tech Company"
      );
    });

    describe("Credential Sharing", function () {
      it("should share a credential", async function () {
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("share-test")
        );

        const tx = await credentialVerifier
          .connect(holder1)
          .shareCredential(
            verifier1.address,
            credentialHash,
            0, // TEMPORARY
            7, // 7 days
            "Job Application"
          );

        expect(tx).to.emit(credentialVerifier, "CredentialShared");

        const share = await credentialVerifier.getCredentialShare(0);
        expect(share.credentialHolder).to.equal(holder1.address);
        expect(share.sharedWith).to.equal(verifier1.address);
      });

      it("should revoke a share", async function () {
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("revoke-test")
        );

        await credentialVerifier
          .connect(holder1)
          .shareCredential(
            verifier1.address,
            credentialHash,
            0,
            7,
            "Test Share"
          );

        await credentialVerifier.connect(holder1).revokeShare(0);

        const share = await credentialVerifier.getCredentialShare(0);
        expect(share.isActive).to.be.false;
      });

      it("should check if share is active", async function () {
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("active-test")
        );

        await credentialVerifier
          .connect(holder1)
          .shareCredential(
            verifier1.address,
            credentialHash,
            1, // PERMANENT
            0,
            "Permanent Share"
          );

        expect(await credentialVerifier.isShareActive(0)).to.be.true;
      });
    });

    describe("Verification Requests", function () {
      it("should request credential verification", async function () {
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("verification-test")
        );

        const tx = await credentialVerifier
          .connect(verifier1)
          .requestVerification(holder1.address, credentialHash, "Job Hiring");

        expect(tx).to.emit(credentialVerifier, "VerificationRequested");

        const request = await credentialVerifier.getVerificationRequest(0);
        expect(request.requester).to.equal(verifier1.address);
        expect(request.status).to.equal(0); // PENDING
      });

      it("should complete verification", async function () {
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes("complete-test")
        );

        await credentialVerifier
          .connect(verifier1)
          .requestVerification(holder1.address, credentialHash, "Hiring");

        await credentialVerifier
          .connect(verifier1)
          .completeVerification(0, true);

        const request = await credentialVerifier.getVerificationRequest(0);
        expect(request.status).to.equal(1); // VERIFIED
      });
    });
  });
});
