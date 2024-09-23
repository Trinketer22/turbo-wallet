import { ShardedContract  } from '../ShardedContract';
import { Cell, Contract } from '@ton/ton';
import { HighloadWalletV3, HighloadWalletV3Config } from '../../wrappers/HighloadWalletV3';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';

const highloadCode = Cell.fromBase64("te6cckECEAEAAigAART/APSkE/S88sgLAQIBIAIDAgFIBAUB9vLUgwjXGNEh+QDtRNDT/9Mf9AT0BNM/0xXR+CMhoVIguY4SM234IySqAKESuZJtMt5Y+CMB3lQWdfkQ8qEG0NMf1NMH0wzTCdM/0xXRUWi68qJRWrrypvgjKqFSULzyowT4I7vyo1MEgA30D2+hmdAk1yHXCgDyZJEw4g4AeNAg10vAAQHAYLCRW+EB0NMDAXGwkVvg+kAw+CjHBbORMODTHwGCEK5C5aS6nYBA1yHXTPgqAe1V+wTgMAIBIAYHAgJzCAkCASAMDQARrc52omhrhf/AAgEgCgsAGqu27UTQgQEi1yHXCz8AGKo77UTQgwfXIdcLHwAbuabu1E0IEBYtch1wsVgA5bi/Ltou37IasJAoQJsO1E0IEBINch9AT0BNM/0xXRBY4b+CMloVIQuZ8ybfgjBaoAFaESuZIwbd6SMDPikjAz4lIwgA30D2+hntAh1yHXCgCVXwN/2zHgkTDiWYAN9A9voZzQAdch1woAk3/bMeCRW+JwgB/lMJgA30D2+hjhPQUATXGNIAAfJkyFjPFs+DAc8WjhAwyCTPQM+DhAlQBaGlFM9A4vgAyUA5gA30FwTIy/8Tyx/0ABL0ABLLPxLLFcntVPgPIdDTAAHyZdMCAXGwkl8D4PpAAdcLAcAA8qX6QDH6ADH0AfoAMfoAMYBg1yHTAAEPACDyZdIAAZPUMdGRMOJysfsAJb3e9Q==");

type GenerateOptionsSubwallet = {
    type : 'subwallet',
} & HighloadWalletV3Config;

type GenerateOptionsMnemonic = {
    type: 'mnemonic'
} & HighloadWalletV3Config;

type GenerateOptions = GenerateOptionsSubwallet | GenerateOptionsMnemonic;

const subwalletBoundry = (2 ** 32) - 1;

export class ShardedHighloadV3 extends ShardedContract {
    protected _options: HighloadWalletV3Config;

    protected _contract: HighloadWalletV3;
    protected code: Cell;
    protected type: GenerateOptions['type'];
    protected mnemonic?: string[];

    constructor(options: GenerateOptions, code?: Cell) {
        super();
        this.type = options.type

        this._options = {
            timeout: options.timeout,
            subwalletId: options.subwalletId,
            publicKey: options.publicKey
        }
        this.code = code ?? highloadCode;
        this._contract  = HighloadWalletV3.createFromConfig(this._options, this.code);
    }

    async next() {
        let nextWallet: HighloadWalletV3;
        if(this.type == 'subwallet') {
            this._options.subwalletId = (this._options.subwalletId + 1) % subwalletBoundry;
        }
        else {
            const newMnemonic =  await mnemonicNew(24);
            const keyPair = await mnemonicToPrivateKey(newMnemonic);
            this._options.publicKey = keyPair.publicKey;
            this.mnemonic = newMnemonic;
        }

        nextWallet = HighloadWalletV3.createFromConfig({
            ...this._options,
        }, this.code);

        this._contract = nextWallet;
        return this;
    }
    get options() {
        if(this.type == 'mnemonic') {
            return {
                ...this._options,
                mnemonic: this.mnemonic
            }
        }
        return this._options;
    }
}
