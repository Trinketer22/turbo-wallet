import { beginCell, Cell, Address, Contract, contractAddress, ContractProvider } from "@ton/ton"

export type HighloadWalletV2Config = {
    publicKey: Buffer,
    subwalletId: number
}

const bigint2buff = (num:bigint) : Buffer => {
    let hexStr = num.toString(16).padStart(64, '0');
    return Buffer.from(hexStr, 'hex')
}

export function highloadWalletV2ConfigToCell(config: HighloadWalletV2Config): Cell {
    return beginCell().storeUint(config.subwalletId, 32)
                      .storeUint(0, 64)
                      .storeBuffer(config.publicKey)
                      .storeMaybeRef(null)
           .endCell();
}

export function highloadWalletV2ParseConfigCell(data: Cell) {
    const ds = data.beginParse();
    return {
        subwalletId: ds.loadUint(32),
        lastCleared: ds.loadUintBig(64),
        publicKey: ds.loadBuffer(32),
        queries: ds.loadMaybeRef()
    }
}

export class HighloadWalletV2 implements Contract {
    constructor(readonly address: Address, readonly init?: {code: Cell, data: Cell}) {
    }
    static createFromAddress(address: Address) {
        return new HighloadWalletV2(address);
    }
    static createFromConfig(config: HighloadWalletV2Config, code: Cell, workchain = 0) {
        const data = highloadWalletV2ConfigToCell(config);
        const init = {code, data};
        return new HighloadWalletV2(contractAddress(workchain, init), init);
    }

    async getInfo(provider: ContractProvider) {
        const state = await provider.getState(); 
        if(state.state.type !== 'active') {
            throw new Error("Contract is not active");
        }
        if(!state.state.data) {
            throw new Error("Contract has no data");
        }


        return highloadWalletV2ParseConfigCell(Cell.fromBoc(state.state.data)[0]);
    }
}
