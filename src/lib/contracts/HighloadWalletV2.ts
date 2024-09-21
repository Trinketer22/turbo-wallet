import { ShardedContract  } from '../ShardedContract';
import { Cell, Contract } from '@ton/ton';
import { HighloadWalletV2, HighloadWalletV2Config } from '../../wrappers/HighloadWalletV2';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';

const highloadCode = Cell.fromBase64("te6ccgEBCQEA5QABFP8A9KQT9LzyyAsBAgEgAgMCAUgEBQHq8oMI1xgg0x/TP/gjqh9TILnyY+1E0NMf0z/T//QE0VNggED0Dm+hMfJgUXO68qIH+QFUEIf5EPKjAvQE0fgAf44WIYAQ9HhvpSCYAtMH1DAB+wCRMuIBs+ZbgyWhyEA0gED0Q4rmMQHIyx8Tyz/L//QAye1UCAAE0DACASAGBwAXvZznaiaGmvmOuF/8AEG+X5dqJoaY+Y6Z/p/5j6AmipEEAgegc30JjJLb/JXdHxQANCCAQPSWb6VsEiCUMFMDud4gkzM2AZJsIeKz");

type GenerateOptionsSubwallet = {
    type: 'subwallet',
} & HighloadWalletV2Config
type GenerateOptionsMnemonic = {
    type: 'mnemonic',
} & HighloadWalletV2Config
type GenerateOptions = GenerateOptionsSubwallet | GenerateOptionsMnemonic;

const subwalletBoundry = (2 ** 32) - 1;
export class ShardedHighloadV2 extends ShardedContract {
    protected _options: HighloadWalletV2Config;

    protected _contract: HighloadWalletV2;
    protected code: Cell;
    protected type: GenerateOptions['type'];
    protected mnemonic?: string[];

    constructor(options: GenerateOptions, code?: Cell) {
        super();
        this.type = options.type;

        this._options = {
            subwalletId: options.subwalletId,
            publicKey: options.publicKey
        }
        this.code = code ?? highloadCode;
        this._contract  = HighloadWalletV2.createFromConfig(this._options, this.code);
    }
    async next() {
        let nextWallet: HighloadWalletV2;
        if(this.type == 'subwallet') {
            this._options.subwalletId = (this._options.subwalletId + 1) % subwalletBoundry;
        }
        else {
            const newMnemonic =  await mnemonicNew(24);
            const keyPair     = await mnemonicToPrivateKey(newMnemonic);
            this._options.publicKey = keyPair.publicKey;
        }

        nextWallet = HighloadWalletV2.createFromConfig({
            ...this._options,
        }, this.code);

        this._contract = nextWallet;
        return this;
    }
    get options() {
        if(this.type == 'mnemonic') {
            return {...this._options, mnemonic: this.mnemonic};
        }
        return this._options;
    }
}
