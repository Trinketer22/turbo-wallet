#!/usr/bin/env node
import { Blockchain } from '@ton/sandbox';
import { findLocalJetton, loadContracts } from '../lib/turboWallet';
import { Address } from '@ton/ton';
import { open, readFile, writeFile } from 'node:fs/promises';
import arg from 'arg';
import { ShardedFactory } from '../lib/ShardedFactory';
import { ShardedContract } from '../lib/ShardedContract';

const supported = ['HighloadV3', 'HighloadV2'];
function help() {
    console.log("--contract <your contract address>");
    console.log("--type <your contract type> (default HighloadV3)");
    console.log("--testnet [is testnet?]");
    console.log("--api-key [Toncenter api key]");
    console.log("--preferred-shard [prefered shard index or comma separated list of them]");
    console.log("--out [path to output file]");
    console.log(`${__filename} --wallet <my-wallet> <path-to-jetton-list>`);
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
        '--api-key': String,
        '--testnet': Boolean,
        '--preferred-shard': String,
        '--out': String
    }, {stopAtPositional: true});

    const contractType = (args['--type'] ?? 'HighloadV3').toLowerCase();
    if(contractType == '?') {
        supportedTypes();
        return;
    }
    if(!args['--contract']) {
        console.log("Contract address is required!");
        help();
        return;
    }
    if(args._.length == 0) {
        console.log("Path to file with jetton minter addresses is required!");
        help();
        return;
    }
    let shards = new Set<number>();
    if(args['--preferred-shard']) {
        const testShards = args['--preferred-shard'].split(',');
        for(let testShard of testShards) {
            const shardIdx = Number(testShard);
            if(shardIdx < 0 || shardIdx > 15) {
                throw RangeError(`Shard value should be from 0 to 15`);
            }
            shards.add(shardIdx);
        }
    }
    const isTestnet = args['--testnet'];

    const myContract = Address.parse(args['--contract']);
    const myJettons  = await readJettons(args._[0]);

    const blockchain = await Blockchain.create();
    const contracts  = await loadContracts([...myJettons, myContract], blockchain, isTestnet, args['--api-key']);

    const shardedFactory = new ShardedFactory(blockchain);

    const contractState = contracts.get(myContract.toRawString());
    if(!contractState) {
        throw new Error("Failed to load contract");
    }
    let sharded: ShardedContract;
    switch(contractType) {
        case 'highloadv3':
            sharded = await shardedFactory.createHighloadFromAddress(myContract,
                                                                     'subwallet', 'V3',
                                                                     contractState.code);
            break;
        case 'highloadv2':
            sharded = await shardedFactory.createHighloadFromAddress(myContract,
                                                                     'subwallet', 'V2',
                                                                     contractState.code);
            break;
        default:
            console.log(`Contract type ${args['--type']} is not supported`);
            help();
            return;
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
