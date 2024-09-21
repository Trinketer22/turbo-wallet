import { Blockchain } from "@ton/sandbox";
import { Address, Cell } from "@ton/ton";
import { ShardedHighloadV3 } from "./contracts/HighloadWalletV3";
import { ShardedHighloadV2 } from "./contracts/HighloadWalletV2";
import { ShardedContract } from "./ShardedContract";
import { HighloadWalletV3 } from "../wrappers/HighloadWalletV3";
import { HighloadWalletV2 } from "../wrappers/HighloadWalletV2";

export class ShardedFactory {
    protected blockchain: Blockchain;

    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;
    }
    async createHighloadFromAddress(address: Address, searchType: ShardedHighloadV3['type'], type: 'V3', code: Cell): Promise<ShardedHighloadV3>;
    async createHighloadFromAddress(address: Address, searchType: ShardedHighloadV2['type'], type: 'V2', code: Cell): Promise<ShardedHighloadV2>;
    async createHighloadFromAddress(address: Address, searchType: ShardedHighloadV3['type'], type: 'V3' | 'V2', code: Cell) {
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
