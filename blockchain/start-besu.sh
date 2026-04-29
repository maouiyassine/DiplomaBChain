#!/bin/bash

cd "$(dirname "$0")"

echo "=========================================="
echo "  Hyperledger Besu — Diploma Verification "
echo "  Consensus : Clique PoA (single node)    "
echo "=========================================="

if ! command -v besu &> /dev/null; then
    echo "❌ Besu non trouvé. Installez-le avec :"
    echo "   brew install hyperledger/besu/besu"
    exit 1
fi

echo "✅ $(besu --version 2>&1 | head -1)"
echo ""
echo "Démarrage du nœud (chainId=1337, Clique PoA)..."
echo "HTTP RPC : http://127.0.0.1:8545"
echo "WS       : ws://127.0.0.1:8546"
echo ""
echo "Comptes MetaMask :"
echo "  [Admin]     0x627306090abaB3A6e1400e9345bC60c78a8BEf57  clé: 0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"
echo "  [Ministère] 0xf17f52151EbEF6C7334FAD080c5704D77216b732  clé: 0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f"
echo "  [Université]0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef  clé: 0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1"
echo "  [Étudiant]  0x821aEa9a577a9b44299B9c15c88cf3087F3b5544  clé: 0xc88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter."
echo "=========================================="

mkdir -p data/node1
# Supprimer le lock RocksDB si une ancienne instance s'est arrêtée brutalement
rm -f data/node1/database/LOCK

besu \
  --genesis-file=config/clique-genesis.json \
  --data-path=data/node1 \
  --node-private-key-file=config/nodekey \
  --rpc-http-enabled \
  --rpc-http-host=127.0.0.1 \
  --rpc-http-port=8545 \
  --rpc-http-api=ETH,NET,WEB3,ADMIN,MINER,CLIQUE \
  --rpc-http-cors-origins="*" \
  --host-allowlist="*" \
  --rpc-ws-enabled \
  --rpc-ws-host=127.0.0.1 \
  --rpc-ws-port=8546 \
  --rpc-ws-api=ETH,NET,WEB3 \
  --min-gas-price=0 \
  --p2p-enabled=true \
  --p2p-host=127.0.0.1 \
  --p2p-port=30303 \
  --logging=WARN
