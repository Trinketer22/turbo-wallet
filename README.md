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
 npm run build
```

### Help

``` shell
--wallet <your highload wallet address>
--api-key [Toncenter api key]
--preferred-shard [prefered shard index]
```

### Example

``` shell
npx buildTurbo --api-key <your toncenter api key> --preferred-shard [shard-index] --wallet [your highload wallet address] <path to file with jetton minter addresses>
```

## Currently supported contracts

Currently, only [highload wallet](https://github.com/ton-blockchain/highload-wallet-contract-v3) is supported.  
I think sort of plugin system is in order here in the future.
