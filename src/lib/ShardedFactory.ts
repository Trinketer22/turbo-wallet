import { Blockchain } from "@ton/sandbox";
import { Address, Cell } from "@ton/ton";
import { ShardedHighloadV3 } from "./contracts/HighloadWalletV3";
import { ShardedHighloadV2 } from "./contracts/HighloadWalletV2";
import { HighloadWalletV3 } from "../wrappers/HighloadWalletV3";
import { HighloadWalletV2 } from "../wrappers/HighloadWalletV2";

export type HighloadV2Params = {publicKey: string, subwalletId?:number};
export type HighloadV3Params = HighloadV2Params & { timeout: number };
export class ShardedFactory {
    protected blockchain: Blockchain;

    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;
    }

    async createHighloadFromParameters(searchType: ShardedHighloadV3['type'], type: 'V3', parameters: HighloadV3Params): Promise<ShardedHighloadV3>;
    async createHighloadFromParameters(searchType: ShardedHighloadV2['type'], type: 'V2', parameters: HighloadV2Params): Promise<ShardedHighloadV2>;

    async createHighloadFromParameters(searchType: ShardedHighloadV3['type'] | ShardedHighloadV2['type'], type: 'V3' | 'V2', parameters: HighloadV3Params | HighloadV2Params) {
        const pubKeyBuffer = Buffer.from(parameters.publicKey, 'hex');
        if(pubKeyBuffer.length != 32) {
            throw RangeError("256 bit public key expected!");
        }

        if(type == 'V3') {
            const v3Params = parameters as HighloadV3Params;
            if(!v3Params.timeout) {
                throw new Error("timeout is required in HighloadV3");
            }
            return new ShardedHighloadV3({
                type: searchType,
                publicKey: pubKeyBuffer,
                timeout: v3Params.timeout,
                subwalletId: parameters.subwalletId ?? 0
            });
        }
        return new ShardedHighloadV2({
            type: searchType,
            publicKey: pubKeyBuffer,
            subwalletId: parameters.subwalletId ?? 0
        });
    }
    async createHighloadFromAddress(address: Address, searchType: ShardedHighloadV3['type'], type: 'V3', code?: Cell): Promise<ShardedHighloadV3>;
    async createHighloadFromAddress(address: Address, searchType: ShardedHighloadV2['type'], type: 'V2', code?: Cell): Promise<ShardedHighloadV2>;
    async createHighloadFromAddress(address: Address, searchType: ShardedHighloadV3['type'], type: 'V3' | 'V2', code?: Cell) {
        if(type == 'V3') {
            const curWallet = this.blockchain.openContract(HighloadWalletV3.createFromAddress(address));

            const timeout   = await curWallet.getTimeout();
            const publicKey = await curWallet.getPublicKey();
            const subwalletId = await curWallet.getSubwalletId();
            return new ShardedHighloadV3({
                type: searchType,
                subwalletId,
                publicKey,
                timeout
            }, code);
        }

        const curWallet = this.blockchain.openContract(HighloadWalletV2.createFromAddress(address));
        const info = await curWallet.getInfo();
        const publicKey = info.publicKey;
        const subwalletId = info.subwalletId;

        return new ShardedHighloadV2({
            type: searchType,
            subwalletId,
            publicKey
        }, code);
    }
}
