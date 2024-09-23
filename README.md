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
--contract <your highload wallet address>
--type <type of your contract> (HighloadV3 by default)
--api-key [Toncenter api key]
--preferred-shard [prefered shard index]
```

### Example

``` shell
npx buildTurbo --api-key [your toncenter api key> --type [contract type] --preferred-shard [comma separated shard-index list] --contract [your previously deployed contract address] <path to file with jetton minter addresses>
```

## Currently supported contracts

Currently supported:
- [HighloadV3](https://github.com/ton-blockchain/highload-wallet-contract-v3) is supported.  
- [HighloadV2](https://github.com/ton-blockchain/ton/blob/master/crypto/smartcont/highload-wallet-v2-code.fc)

To list supported types call `npx buildTurbo --type ?`;
