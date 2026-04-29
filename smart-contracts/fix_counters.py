#!/usr/bin/env python3
import os

# Fix Diploma.sol
diploma_path = '/Users/yassinemaoui/diploma-verification/smart-contracts/contracts/Diploma.sol'
with open(diploma_path, 'r') as f:
    content = f.read()

# Replace Counters patterns
content = content.replace('_credentialIdCounter.current()', '_credentialIdCounter')
content = content.replace('_credentialIdCounter.increment()', '_credentialIdCounter++')

with open(diploma_path, 'w') as f:
    f.write(content)
print("✓ Diploma.sol fixed")

# Fix CredentialVerifier.sol
verifier_path = '/Users/yassinemaoui/diploma-verification/smart-contracts/contracts/CredentialVerifier.sol'
with open(verifier_path, 'r') as f:
    content = f.read()

content = content.replace('_shareIdCounter.current()', '_shareIdCounter')
content = content.replace('_shareIdCounter.increment()', '_shareIdCounter++')
content = content.replace('_verificationRequestIdCounter.current()', '_verificationRequestIdCounter')
content = content.replace('_verificationRequestIdCounter.increment()', '_verificationRequestIdCounter++')

with open(verifier_path, 'w') as f:
    f.write(content)
print("✓ CredentialVerifier.sol fixed")

print("✓ All counter references updated for OpenZeppelin v5")
