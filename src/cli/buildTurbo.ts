#!/usr/bin/env node
import { Blockchain } from '@ton/sandbox';
import { findLocalJetton, loadContracts } from '../lib/turboWallet';
import { Address } from '@ton/ton';
import { open, readFile } from 'node:fs/promises';
import arg from 'arg';
import { ShardedFactory } from '../lib/ShardedFactory';
import { ShardedContract } from '../lib/ShardedContract';

const supported = ['HighloadV3', 'HighloadV2'];
function help() {
    console.log("--contract <your contract address>");
    console.log("--type <your contract type> (default HighloadV3)");
    console.log("--api-key [Toncenter api key]");
    console.log("--preferred-shard [prefered shard index]");
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
        '--preferred-shard': Number,
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
    if(args['--preferred-shard']) {
        if(args['--preferred-shard'] < 0 || args['--preferred-shard'] > 15) {
            throw RangeError(`Shard value should be from 0 to 15`);
        }
    }

    const myContract = Address.parse(args['--contract']);
    const myJettons  = await readJettons(args._[0]);

    const blockchain = await Blockchain.create();
    const contracts  = await loadContracts([...myJettons, myContract], blockchain, args['--api-key']);

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

    const res  = await findLocalJetton(blockchain, sharded, myJettons, {
        preferredShard: args['--preferred-shard'],
        displayProgress: true
    });
    console.log("Found nonce:", JSON.stringify(res.options, (k, v) => {
        if(k == 'publicKey') {
            return undefined;
        }
        return v;
    }, 2));
}

if(require.main == module) {
    run();
}
