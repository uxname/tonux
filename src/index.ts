import {KeyPair, ResultOfProcessMessage, ResultOfQueryCollection, signerKeys, TonClient} from '@tonclient/core';
import {Account} from '@tonclient/appkit';
import {WalletContract} from '../contracts/wallet/WalletContract.js';
import BigNumber from 'bignumber.js';

// eslint-disable-next-line no-shadow
export enum AccountType {
    UN_INIT = 0,
    ACTIVE = 1,
    // eslint-disable-next-line no-magic-numbers
    FROZEN = 2,
    // eslint-disable-next-line no-magic-numbers
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
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any[] = queryCollectionResult.result;
        if (!result.length) {
            return AccountType.NON_EXIST;
        }

        return result[0].acc_type;
    }

    async getBalance(address: string): Promise<BigNumber> {
        const res = await this.client.net.query({
            query: `query GetBalance($address: String!) {
                  accounts(filter: { id: { eq: $address } }) {
                    id
                    balance
                  }
                }`,
            variables: {address}
        });
        if (res.result.data.accounts[0]?.balance) {
            return new BigNumber(res.result.data.accounts[0]?.balance);
        } else {
            return null;
        }
    }

    tokenToNanoToken(value: BigNumber): BigNumber {
        const NANO_IN_ONE = 1_000_000_000;
        return value.multipliedBy(new BigNumber(NANO_IN_ONE));
    }

    nanoTokenToToken(value: BigNumber): BigNumber {
        const NANO_IN_ONE = 1_000_000_000;
        return value.dividedBy(new BigNumber(NANO_IN_ONE));
    }

    async sendCoin(senderAccount: Account, receiverAddress: string, amountNano: BigNumber): Promise<ResultOfProcessMessage> {
        return await senderAccount.run('sendTransaction', {
            dest: receiverAddress,
            value: amountNano.toString(),
            bounce: false,
            flags: 1,
            payload: ''
        });
    }
}

