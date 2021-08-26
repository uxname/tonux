import {
    abiContract,
    KeyPair,
    ResultOfProcessMessage,
    ResultOfQueryCollection,
    signerKeys,
    TonClient,
    TransactionNode
} from '@tonclient/core';
import {Account} from '@tonclient/appkit';
import {WalletContract} from '../contracts/wallet/WalletContract';
import BigNumber from 'bignumber.js';
import {BinaryLibrary} from '@tonclient/lib-node';
import {ParamsOfProcessMessage} from '@tonclient/core/dist/modules';

// eslint-disable-next-line no-shadow
export enum AccountType {
    UN_INIT = 0,
    ACTIVE = 1,
    // eslint-disable-next-line no-magic-numbers
    FROZEN = 2,
    // eslint-disable-next-line no-magic-numbers
    NON_EXIST = 3
}

type TransactionItem = TransactionNode & {
    timestamp: number
}

export class Tonux {
    client: TonClient;

    constructor(endpoints: string[], binaryLibrary: () => Promise<BinaryLibrary>) {
        TonClient.useBinaryLibrary(binaryLibrary);
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

    async getTransactions(address: string): Promise<TransactionItem[]> {
        const res = await this.client.net.query({
            query: `query AccountTransactions($address: String!) {
                      transactions(filter: { account_addr: { eq: $address } }) {
                        id
                        in_msg
                        out_msgs
                        account_addr
                        total_fees
                        aborted
                        balance_delta
                        tr_type
                        tr_type_name
                        account_addr
                        block {
                          id
                          gen_utime
                        }
                      }
                    }`,
            variables: {address}
        });
        return res.result.data.transactions.map(tx => ({
            ...tx,
            timestamp: tx.block.gen_utime
        }));
    }

    async contractCall(data: { keyPair: KeyPair, contractAddress: string, abi: unknown, methodName: string, params?: unknown }): Promise<ResultOfProcessMessage> {
        const _params: ParamsOfProcessMessage = {
            send_events: false,
            message_encode_params: {
                address: data.contractAddress,
                abi: abiContract(data.abi),
                call_set: {
                    function_name: data.methodName,
                    input: data.params
                },
                signer: {
                    type: 'Keys',
                    keys: data.keyPair
                }
            }
        };
        const response = await this.client.processing.process_message(_params);
        console.log(`Contract run transaction with output ${response.decoded.output}, ${response.transaction.id}`);
        return response;
    }

}

