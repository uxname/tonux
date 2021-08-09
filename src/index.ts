import {KeyPair, ResultOfQueryCollection, signerKeys, TonClient} from "@tonclient/core";
import {Account} from "@tonclient/appkit";
import {WalletContract} from "../contracts/wallet/WalletContract.js"

export enum AccountType {
    UN_INIT = 0,
    ACTIVE = 1,
    FROZEN = 2,
    NON_EXIST = 3
}

export class Tonux {
    client: TonClient;

    constructor(endpoints: string[]) {
        this.client = new TonClient({network: {endpoints}});
    }

    async generateKeypair(): Promise<KeyPair> {
        return await TonClient.default.crypto.generate_random_sign_keys();
    }

    async keyPairFromSecret(secret: string): Promise<KeyPair> {
        const tmp = await TonClient.default.crypto.nacl_sign_keypair_from_secret_key({secret});
        return {
            public: tmp.public,
            secret
        };
    }

    walletFromKeyPair(keypair: KeyPair): Account {
        return new Account(WalletContract, {
            signer: signerKeys(keypair),
            client: this.client
        });
    }

    async getAccountType(address: string): Promise<AccountType> {
        const queryCollectionResult: ResultOfQueryCollection = await this.client.net.query_collection({
            collection: 'accounts',
            filter: {
                id: {
                    eq: address
                }
            },
            result: 'acc_type'
        })
        const result: any[] = queryCollectionResult.result;
        if (!result.length)
            return AccountType.NON_EXIST

        return result[0]['acc_type']
    }
}
