# DiplomaChain — Système de Vérification de Diplômes sur Blockchain

> Plateforme décentralisée de délivrance et de vérification de diplômes académiques, basée sur **Hyperledger Besu** et **IPFS**.

---

## Présentation

DiplomaChain résout le problème de la fraude aux diplômes en enregistrant chaque credential sur une blockchain immuable. L'authenticité d'un diplôme peut être vérifiée en quelques secondes par n'importe quel employeur, sans contacter l'université.

### Acteurs du système

| Acteur | Rôle | Accès |
|---|---|---|
| 🏛️ **Ministère** | Accrédite les universités, approuve les diplômes | `/ministry` |
| 🏫 **Université** | Émet les diplômes pour les étudiants | `/university` |
| 🎓 **Étudiant** | Consulte, partage et télécharge ses diplômes | `/student` |
| 🏢 **Employeur** | Vérifie l'authenticité d'un diplôme | `/employer` |

### Workflow d'approbation

```
Université émet diplôme
        │
        ▼
   [PENDING ⏳]
        │
   Ministère examine
        │
   ┌────┴────┐
   ▼         ▼
[ISSUED ✅] [REJECTED 🚫]
   │
   ▼
Étudiant partage → Employeur vérifie
```

---

## Architecture technique

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                            │
│         React 17 · ethers.js v6 · MetaMask             │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼────────┐
│  BLOCKCHAIN    │         │     STOCKAGE    │
│ Hyperledger    │◄───────►│      IPFS       │
│ Besu (2 nœuds) │  sync   │ (décentralisé) │
│ Clique PoA     │         │  CID on-chain   │
│ chainId 1337   │         └─────────────────┘
└───────┬────────┘
        │
┌───────▼────────┐
│ SMART CONTRACT │
│ DiplomaRegistry│
│ Solidity 0.8.20│
│ OpenZeppelin   │
└────────────────┘
```

### Stack

- **Blockchain** : Hyperledger Besu — Clique PoA, 2 nœuds
- **Smart Contracts** : Solidity 0.8.20, OpenZeppelin AccessControl
- **Stockage** : IPFS (Kubo) — fichiers PDF décentralisés
- **Frontend** : React 17, ethers.js v6, webpack 5
- **Authentification** : MetaMask — cryptographie asymétrique secp256k1

---

## Prérequis

```bash
besu --version     # Hyperledger Besu ≥ 24.x
ipfs version       # Kubo ≥ 0.28
node --version     # Node.js ≥ 18
```

Installation si manquant :
```bash
brew install hyperledger/besu/besu
brew install ipfs
brew install node
```

---

## Installation

```bash
# 1. Cloner le projet
git clone <url-du-projet>
cd diploma-verification

# 2. Installer les dépendances frontend
npm install

# 3. Installer les dépendances smart contracts
cd smart-contracts && npm install && cd ..

# 4. Initialiser IPFS (première fois uniquement)
ipfs init
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:3001"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT","POST","GET"]'
```

---

## Démarrage

```bash
bash start.sh
```

Lance automatiquement :
1. **Besu Node 1** (validateur) — `http://127.0.0.1:8545`
2. **Besu Node 2** (membre) — `http://127.0.0.1:8547`
3. **IPFS daemon** — `http://127.0.0.1:5001`
4. **Frontend** — `http://localhost:3001`

---

## Déploiement du contrat

Si Besu redémarre depuis zéro :

```bash
cd smart-contracts
npx hardhat run scripts/deploy.js --network besuLocal
```

Puis mettre à jour l'adresse dans `src/utils/blockchain.js`.

---

## Comptes MetaMask

Importer via **MetaMask → Importer un compte → Clé privée** :

| Rôle | Adresse | Clé privée |
|---|---|---|
| Ministère | `0xf17f52151EbEF6C7334FAD080c5704D77216b732` | `0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f` |
| Université (test) | `0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef` | `0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1` |
| Étudiant (test) | `0x821aEa9a577a9b44299B9c15c88cf3087F3b5544` | `0xc88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c` |

> En production, chaque acteur génère son propre compte MetaMask.

---

## Flux de test complet

```
1. Ministère  → /ministry   → Accréditer une université
2. Université → /university → Émettre un diplôme (PDF requis)
3. Ministère  → /ministry   → Approuver le diplôme
4. Étudiant   → /student    → Voir le diplôme ✅ + partager QR code
5. Employeur  → /employer   → Uploader le PDF → vérification instantanée
```

---

## Smart Contract — Rôles et statuts

```solidity
// Rôles
MINISTRY_ROLE  → accrédite universités, approuve/rejette diplômes
ISSUER_ROLE    → émet les diplômes (accordé par le Ministère)

// Statuts
PENDING   (0) → en attente d'approbation ministère
ISSUED    (1) → approuvé et valide
SUSPENDED (2) → suspendu temporairement
REVOKED   (3) → révoqué définitivement
REJECTED  (4) → rejeté par le Ministère
```

---

## Tests

```bash
npm run contract:test   # 24/24 tests Hardhat
npm test                # 3/3 tests Jest
```

---

## Structure du projet

```
diploma-verification/
├── start.sh                        # Démarrage unique (Besu + IPFS + Frontend)
├── src/
│   ├── pages/
│   │   ├── MinistryDashboard.js
│   │   ├── UniversityDashboard.js
│   │   ├── StudentDashboard.js
│   │   ├── EmployerDashboard.js
│   │   └── Verify.js
│   └── utils/
│       ├── blockchain.js           # Interactions contrat
│       ├── ipfs.js                 # Upload IPFS
│       └── hashUtils.js            # SHA-256
├── smart-contracts/
│   ├── contracts/Diploma.sol       # Contrat principal
│   ├── scripts/deploy.js
│   └── test/DiplomaRegistry.test.js
└── blockchain/
    ├── start-besu.sh               # Node 1 validateur
    ├── start-node2.sh              # Node 2 membre
    └── config/clique-genesis.json
```

---

## Sécurité

- **Immuabilité** : Hash SHA-256 du PDF enregistré on-chain — toute modification invalide la vérification
- **Authentification** : Signature cryptographique MetaMask — impossible d'usurper un rôle
- **Décentralisation** : 2 nœuds Besu synchronisés + IPFS — pas de point de défaillance unique
- **Contrôle d'accès** : OpenZeppelin AccessControl sur chaque fonction sensible

---

## Perspectives

- Déploiement HTTPS en production avec domaine officiel
- Réseau Besu multi-organisations (une université = un nœud dédié)
- Intégration registre national des établissements
- Application mobile (React Native + WalletConnect)
- Audit de sécurité du smart contract
