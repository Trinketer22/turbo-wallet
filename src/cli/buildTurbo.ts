#!/usr/bin/env node
import { Blockchain } from '@ton/sandbox';
import { findLocalHighload, loadContracts } from '../lib/turboWallet';
import { Address } from '@ton/ton';
import { open, readFile } from 'node:fs/promises';
import arg from 'arg';

function help() {
    console.log("--wallet <your highload wallet address>");
    console.log("--api-key [Toncenter api key]");
    console.log("--preferred-shard [prefered shard index]");
    console.log(`${__filename} --wallet <my-wallet> <path-to-jetton-list>`);
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
        '--wallet': String,
        '--api-key': String,
        '--preferred-shard': Number,
    }, {stopAtPositional: true});

    if(!args['--wallet']) {
        console.log("Wallet address is required!");
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

    const myHighload = Address.parse(args['--wallet']);
    const myJettons = await readJettons(args._[0]);

    /*
    const usdt = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
    const not  = Address.parse('EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT');
    const dawgs = Address.parse('EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS');
    const myHighload = Address.parse('UQA27zG4PZlQtKzBdkW_hmDdug6LPuNnuWIltTeT44pxZJwo');
    */

    const blockchain = await Blockchain.create();
    const contracts  = await loadContracts([...myJettons, myHighload], blockchain, args['--api-key']);

    const highloadState = contracts.get(myHighload.toRawString());
    if(!highloadState) {
        throw new Error("Failed to load highload contract");
    }
    const res  = await findLocalHighload(blockchain, myHighload, highloadState.code, myJettons, {
        preferredShard: args['--preferred-shard'],
        displayProgress: true
    });
    console.log("Found wallet:", res);
}

if(require.main == module) {
    run();
}
