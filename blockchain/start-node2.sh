#!/bin/bash

cd "$(dirname "$0")"

echo "=========================================="
echo "  Hyperledger Besu — Node 2 (Member)      "
echo "  Se connecte à Node 1 via P2P            "
echo "=========================================="

mkdir -p data/node2
rm -f data/node2/database/LOCK

# Copier le fichier static-nodes pour que Node 2 trouve Node 1
cp config/static-nodes.json data/node2/static-nodes.json

besu \
  --genesis-file=config/clique-genesis.json \
  --data-path=data/node2 \
  --node-private-key-file=config/nodekey2 \
  --rpc-http-enabled \
  --rpc-http-host=127.0.0.1 \
  --rpc-http-port=8547 \
  --rpc-http-api=ETH,NET,WEB3,ADMIN \
  --rpc-http-cors-origins="*" \
  --host-allowlist="*" \
  --p2p-enabled=true \
  --p2p-host=127.0.0.1 \
  --p2p-port=30304 \
  --min-gas-price=0 \
  --logging=WARN
