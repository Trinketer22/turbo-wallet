# Turbo wallet library

## Purpose

Created to simplify process of generating sharded jetton wallets.

## What is sharded

Sharded means located under same shard prefix.  
Current shard prefix length is first 4 bits of an address.

## Why this is important

It removes shard routing part of transaction processing.  
Which is currently crucial for any mass sending task.

## How to use

### Build

``` shell
 npm i
 npm run build
```

### Help

``` shell
--contract [your contract address] (used to pick up initial contract configuration)"
--type <your contract type> (default HighloadV3. ? will print available list)"
--search-type [subwallet or memonic] (Search is performed either by bruteforcing subwalletId or the mnemonic->pulic key default subwallet)"
--public-key [hex sting] (if contract address is not specified, public key may be passed via comand line argument in subwallet mode)"
--timeout [number] (If contract address is not specified, timeout may be specified for highloadV3 wallet)"
--subwallet-id [number] (if contract address is not specified, subwallet id may be passed via comand line argument in mnemonic mode)"
--testnet [is testnet?]"
--api-key [Toncenter api key]"
--preferred-shard [prefered shard index/dash range/comma separated list of shards]"
--out [path to output file]"

```

### Bruteforce with already deployed contract setting

``` shell
npx buildTurbo --api-key [your toncenter api key] --type [contract type] --preferred-shard [comma separated shard-index list] --contract [your previously deployed contract address] <path to file with jetton minter addresses>
```

### Bruteforce mnemonic for all shards with contract subwallet from parameters

``` shell
npx buildTurbo --type highloadV3 --search-type mnemonic --preferred-shard 0-15 --subwallet-id 1337 --out presets.json <path-to-jetton-list.txt>
```

### Bruteforce subwallet id for all shards with contract public key from parameters

``` shell
npx buildTurbo --type highloadV3 --preferred-shard 0-15 --public-key 24d5cbf58df14bcce7ec0d9b091b7e823d564a682183bee606163429367b61c2 --out presets.json <path-to-jetton-list.txt>
```

## Currently supported contracts

Currently supported:
- [HighloadV3](https://github.com/ton-blockchain/highload-wallet-contract-v3) is supported.  
- [HighloadV2](https://github.com/ton-blockchain/ton/blob/master/crypto/smartcont/highload-wallet-v2-code.fc)

To list supported types call `npx buildTurbo --type ?`;
