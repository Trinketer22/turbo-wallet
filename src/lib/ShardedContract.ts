import { Contract, Cell } from "@ton/ton";

export abstract class ShardedContract {
    protected abstract _contract: Contract;
    protected abstract code?: Cell;
    abstract next(): Promise<ShardedContract>;
    abstract get options(): unknown;
    inShard(shard: number): boolean {
        return this._contract.address.hash[0] >> 4 == shard;
    }
    get contract(): Contract{
        return this._contract;
    }
    get shard(): number {
        return this._contract.address.hash[0] >> 4;
    }
}
