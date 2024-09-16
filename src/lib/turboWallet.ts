import { Address, beginCell, Cell, TonClient } from '@ton/ton';
import { Blockchain, createShardAccount } from '@ton/sandbox';
import { HighloadWalletV3 } from '../wrappers/HighloadWalletV3';
import cliProgress from 'cli-progress';

export async function loadContracts(addr_list: Address[], bc: Blockchain, api_key?: string) {
    const client = new TonClient({
        endpoint:'https://toncenter.com/api/v2/jsonRPC',
        apiKey: api_key
    });

    const contractsMap: Map<string, {code: Cell, data: Cell}> = new Map();
    for(let contract of addr_list) {
        console.log(`Loading ${contract} state...`);
        const state = await client.getContractState(contract);
        if(state.state !== 'active') {
            throw new Error(`Account ${contract} is not active`);
        }
        if(!Buffer.isBuffer(state.code)) {
            throw new Error(`Account ${contract} has no code`);
        }
        if(!Buffer.isBuffer(state.data)) {
            throw new Error(`Account ${contract} has no data`);
        }

        const code = Cell.fromBoc(state.code)[0];
        const data = Cell.fromBoc(state.data)[0];

        contractsMap.set(contract.toRawString(), {
            code,
            data
        });
        await bc.setShardAccount(contract, createShardAccount({
            address: contract,
            balance: state.balance,
            code,
            data
        }));
        if(!api_key) {
            await new Promise((resolve, reject) => {
                setTimeout(resolve, 2000);
            });
        }
    }
    return contractsMap;
}
type VerboseRes = {
    resWallet: string,
    jettons: string[]
}

export async function findLocalHighload(blockchain: Blockchain, highloadAddr: Address, code: Cell, jetton_list: Address[], options: {preferredShard?: number, displayProgress: boolean}) {

    const preferredShard = options.preferredShard;
    const curWallet = blockchain.openContract(HighloadWalletV3.createFromAddress(highloadAddr));

    const timeout   = await curWallet.getTimeout();
    const publicKey = await curWallet.getPublicKey();
    let nextSubwallet = await curWallet.getSubwalletId();

    let allMatch: boolean;
    let walletShard: number
    let iterCount = 0;
    const sizeBoundry = (2 ** 32) - 1;
    let expIter = 2 ** (4 * jetton_list.length);
    let verbose: VerboseRes | undefined;

    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

    if(preferredShard !== undefined) {
        expIter *= 2 ** 4;
    }
    if(options.displayProgress) {
        bar.start(expIter, 0);
    }

    do {
        verbose = undefined;
        nextSubwallet = (nextSubwallet + 1) % sizeBoundry;
        iterCount++;
        allMatch = true;
        const testWallet = HighloadWalletV3.createFromConfig({
            publicKey,
            timeout,
            subwalletId: nextSubwallet 
        }, code);
        walletShard = testWallet.address.hash[0] >> 4;
        if(preferredShard) {
            if(walletShard !== preferredShard) {
                allMatch = false;
            }
        }
        if(allMatch) {
            verbose = {
                resWallet: testWallet.address.toRawString(),
                jettons: []
            };
            for(let jetton of jetton_list) {
                const smc = await blockchain.getContract(jetton);
                const res = await smc.get('get_wallet_address', [{type: 'slice', cell: beginCell().storeAddress(testWallet.address).endCell()}]);
                const resAddr = res.stackReader.readAddress();
                const resShard = resAddr.hash[0] >> 4;
                if(resShard !== walletShard) {
                    allMatch = false;
                    break;
                }
                verbose.jettons.push(resAddr.toRawString());
            }
        }
        if(options.displayProgress && iterCount % 100 == 0) {
            bar.update(iterCount);
        }
    } while(!allMatch);
    bar.stop();

    return {subwallet: nextSubwallet, prefix_shard: walletShard, verbose};
}
