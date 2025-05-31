#!/usr/bin/env node
import { Blockchain } from '@ton/sandbox';
import { findLocalJetton, loadContracts } from '../lib/turboWallet';
import { Address, Cell } from '@ton/ton';
import { open, readFile, writeFile } from 'node:fs/promises';
import arg from 'arg';
import { ShardedFactory } from '../lib/ShardedFactory';
import { ShardedContract } from '../lib/ShardedContract';

const supported = ['HighloadV3', 'HighloadV2'];
function help() {
    console.log("--contract <your contract address>");
    console.log("--type <your contract type> (default HighloadV3)");
    console.log("--search-type [subwallet or memonic] (default subwallet)");
    console.log("--public-key [hex sting] (if contract address is not specified, public key may be passed via comand line argument in subwallet mode)");
    console.log("--timeout [number] (If contract address is not specified, timeout may be specified for highloadV3 wallet)");
    console.log("--subwallet-id [number] (if contract address is not specified, subwallet id may be passed via comand line argument in mnemonic mode)");
    console.log("--testnet [is testnet?]");
    console.log("--api-key [Toncenter api key]");
    console.log("--preferred-shard [prefered shard index/dash range/comma separated list of shards]");
    console.log("--out [path to output file]");
    console.log(`${__filename} --contract <my-wallet> <path-to-jetton-list>`);
}
function supportedTypes() {
    console.log(`Supported contract types:\n`);
    console.log(supported.join('\n'));
}
async function readJettons(path: string) {
    const jettonsFile = await open(path, 'r');
    let jettons: Address[] = [];
    for await (let jettonAddr of jettonsFile.readLines({encoding: 'utf8'})) {
        if(jettonAddr == '') {
            continue;
        }
        jettons.push(Address.parse(jettonAddr));
    }
    await jettonsFile.close();
    return jettons;
}
export async function run() {
    const args = arg({
        '--contract': String,
        '--type': String,
        '--search-type': String,
        '--public-key': String,
        '--subwallet-id': Number,
        '--timeout': Number,
        '--api-key': String,
        '--testnet': Boolean,
        '--preferred-shard': String,
        '--out': String
    }, {stopAtPositional: true});

    const contractType = (args['--type'] ?? 'HighloadV3').toLowerCase();
    if(contractType == '?') {
        supportedTypes();
        return -1;
    }
    if(!supported.find(v => v.toLowerCase() == contractType)) {
        console.log(`Contract type ${contractType} is not supported!`);
        supportedTypes();
        return -1;
    }

    let publicKey: string;
    let timeout: number;
    let fromParams: boolean;
    let contractAddress: Address | undefined;
    let contractCode: Cell | undefined;
    let subwalletId = 0;


    let searchType: 'subwallet' | 'mnemonic' = "subwallet";

    if(args['--search-type']) {
        searchType = args['--search-type'] as any;
        if(!(searchType == "subwallet" || searchType == "mnemonic")) {
            throw new RangeError("Search type subwallet or mnemonic is supported");
        }
    }

    if(args['--subwallet-id']) {
        if(searchType !== 'mnemonic') {
            throw new Error("Subwallet option is only allowed in mnemonic search mode");
        }
        subwalletId = Number(args['--subwallet-id']);
        if(Number.isNaN(subwalletId)) {
            throw new TypeError(`Failed to parse subwellet id ${args['--subwallet-id']}`);
        }
    }
    if(!args['--contract']) {
        if(contractType == 'highloadv2' || contractType == 'highloadv3' && searchType !== 'mnemonic') {
            if(!args['--public-key']) {
                console.error("If contract is not specified, public key is required");
                help();
                return -1;
            }
            publicKey = args['--public-key'];
        } else if(searchType == 'mnemonic') {
            publicKey = ''.padStart(64, '0');
        }

        if(contractType == 'highloadv3') {
            if(!args['--timeout']) {
                console.error("If contract is not specified, timeout is required for HighloadV3");
                help();
                return -1;
            }
            timeout = args['--timeout'];
        }
        fromParams = true;
    } else {
        fromParams = false;
        contractAddress = Address.parse(args['--contract']);
    }

    if(args._.length == 0) {
        console.error("Path to file with jetton minter addresses is required!");
        help();
        return -1;
    }


    let shards = new Set<number>();
    if(args['--preferred-shard']) {
        let testShards: (number | string)[];
        if(args['--preferred-shard'].indexOf('-') > 0) {
            const splitRange = args['--preferred-shard'].split('-');
            if(splitRange.length != 2) {
                throw RangeError(`Range specifier should containt 2 elements. got ${args['--preferred-shard']}`);
            }
            const rangeStart = Number(splitRange[0]);
            const rangeEnd   = Number(splitRange[1]);

            if(Number.isNaN(rangeStart) || Number.isNaN(rangeEnd) || rangeStart < 0 || rangeEnd < rangeStart) {
                throw RangeError(`Invalid range specifiers ${splitRange[0]}-${splitRange[1]}`);
            }

            testShards = [...Array(rangeEnd + 1).keys()].slice(rangeStart);
        } else {
            testShards = args['--preferred-shard'].split(',');
        }

        for(let testShard of testShards) {
            const shardIdx = Number(testShard);
            if(Number.isNaN(shardIdx) || shardIdx < 0 || shardIdx > 15) {
                throw RangeError(`Shard value should be from 0 to 15 got ${testShard}`);
            }
            shards.add(shardIdx);
        }
    }
    const isTestnet = args['--testnet'];


    const myJettons  = await readJettons(args._[0]);

    const contractToLoad = [...myJettons];

    if(!fromParams) {
        if(contractAddress) {
            contractToLoad.push(contractAddress);
        } else {
            console.error("--contract is required");
            help();
            return -1;
        }
    }
    const blockchain = await Blockchain.create();
    const contracts  = await loadContracts(contractToLoad, blockchain, isTestnet, args['--api-key']);

    const shardedFactory = new ShardedFactory(blockchain);

    if(contractAddress) {
        const contractState = contracts.get(contractAddress.toRawString());
        if(!contractState) {
            throw new Error("Failed to load contract");
        }
        contractCode = contractState.code;
    }

    let sharded: ShardedContract;
    switch(contractType) {
        case 'highloadv3':
            sharded = contractAddress ? await shardedFactory.createHighloadFromAddress(contractAddress,
                                                                     searchType, 'V3',
                                                                     contractCode)
                                      : await shardedFactory.createHighloadFromParameters(searchType, 'V3', {publicKey: publicKey!, timeout: timeout!, subwalletId});
            break;
        case 'highloadv2':
            sharded = contractAddress ? await shardedFactory.createHighloadFromAddress(contractAddress,
                                                                     searchType, 'V2',
                                                                     contractCode)
                                      : await shardedFactory.createHighloadFromParameters(searchType, 'V2', {publicKey: publicKey!, subwalletId});
            break;
        default:
            console.log(`Contract type ${args['--type']} is not supported`);
            help();
            return -1;
    }

    const stringifyResult = (res: Awaited<ReturnType<typeof findLocalJetton>>) => {
        return JSON.stringify(res, (k, v) => {
            if(k == 'publicKey') {
                return undefined;
            }
            return v;
        }, 2)
    }

    let results: string[] = [];
    if(shards.size > 0) {
        for(let shard of shards) {
            const res = await findLocalJetton(blockchain, sharded, myJettons, {
                preferredShard: shard,
                displayProgress: true
            });
            results.push(stringifyResult(res));
            console.log(`Nonce for shard ${res.prefix_shard} found!`);
        }
    }
    else {
        const res = await findLocalJetton(blockchain, sharded, myJettons, {
            displayProgress: true
        });
        results.push(stringifyResult(res));
        console.log(`Nonce for shard ${res.prefix_shard} found!`);
    }
    if(args['--out']) {
        try {
            await writeFile(args['--out'], `${results.join("\n")}\n`, {encoding: 'utf8'});
        }
        catch(e) {
            console.log(`Failed to write to file ${args['--out']} ${e}`);
            console.log("Nonces:", results);
        }
    }
    else {
        console.log("Nonces:", results);
    }
}

if(require.main == module) {
    run();
}
