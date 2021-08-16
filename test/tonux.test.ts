import {AccountType, Tonux} from '../src';
import {libNode} from '@tonclient/lib-node';
import BigNumber from 'bignumber.js';
import {WalletContract} from '../contracts/wallet/WalletContract';

let tonux: Tonux;

beforeAll(() => {
    tonux = new Tonux(['http://localhost'], libNode);
});

afterAll(() => {
    tonux.client.close();
});

test('generate keypair', async () => {
    const keypair = await tonux.generateKeypair();
    expect(keypair).not.toBeNull();
    expect(keypair.secret).not.toBeNull();
    expect(keypair.public).not.toBeNull();
    expect(typeof keypair.secret).toEqual('string');
});

test('wallet from keypair', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    expect(wallet).not.toBeNull();
});

test('deploy wallet', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    expect(await tonux.getAccountType(await wallet.getAddress())).toEqual(AccountType.NON_EXIST);

    await wallet.deploy({useGiver: true});

    expect(await tonux.getAccountType(await wallet.getAddress())).toEqual(AccountType.ACTIVE);
});

test('keypair from secret', async () => {
    const keypair = await tonux.generateKeypair();
    const keypair2 = await tonux.keyPairFromSecret(keypair.secret);

    expect(keypair2.secret).toEqual(keypair.secret);
    expect(keypair2.public).toEqual(keypair.public);
});

test('get balance', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    await wallet.deploy({useGiver: true});

    const balance = await tonux.getBalance(await wallet.getAddress());

    expect(balance.toNumber()).toBeGreaterThan(1);
});

test('send coin', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    await wallet.deploy({useGiver: true});

    const balanceSender = await tonux.getBalance(await wallet.getAddress());

    expect(balanceSender.toNumber()).toBeGreaterThan(1);

    const FAKE_RECEIVER_ADDRESS = '0:5ec3dbe83885261983b4c459b266e1e1333a0c62fff7e52f9e7492b5377fdf32';
    const TEST_AMOUNT = 0.111;

    const balanceReceiverBeforeSend = await tonux.getBalance(FAKE_RECEIVER_ADDRESS);

    await tonux.sendCoin(wallet, FAKE_RECEIVER_ADDRESS, tonux.tokenToNanoToken(new BigNumber(TEST_AMOUNT)));

    const balanceReceiverAfterSend = await tonux.getBalance(FAKE_RECEIVER_ADDRESS);

    const ALLOWED_ERROR = 0.00001;
    const difference = tonux.nanoTokenToToken(balanceReceiverAfterSend.minus(balanceReceiverBeforeSend)).toNumber();

    expect(TEST_AMOUNT - difference).toBeLessThanOrEqual(ALLOWED_ERROR);
});

test('send coin excess of balance', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    await wallet.deploy({useGiver: true});

    const balanceSender = await tonux.getBalance(await wallet.getAddress());

    expect(balanceSender.toNumber()).toBeGreaterThan(1);

    const FAKE_RECEIVER_ADDRESS = '0:5ec3dbe83885261983b4c459b266e1e1333a0c62fff7e52f9e7492b5377fdf32';
    const TEST_AMOUNT = 99999999;

    await expect(tonux.sendCoin(wallet, FAKE_RECEIVER_ADDRESS, tonux.tokenToNanoToken(new BigNumber(TEST_AMOUNT)))).rejects.not.toBeNull();
});

test('transaction history', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    await wallet.deploy({useGiver: true});

    const balanceSender = await tonux.getBalance(await wallet.getAddress());

    expect(balanceSender.toNumber()).toBeGreaterThan(1);

    const FAKE_RECEIVER_ADDRESS = '0:5ec3dbe83885261983b4c459b266e1e1333a0c62fff7e52f9e7492b5377fdf38';
    const TEST_AMOUNT = 0.0123;

    await tonux.sendCoin(wallet, FAKE_RECEIVER_ADDRESS, tonux.tokenToNanoToken(new BigNumber(TEST_AMOUNT)));

    const history = await tonux.getTransactions(FAKE_RECEIVER_ADDRESS);
    expect(history).not.toBeNull();
    expect(history.length).toBeGreaterThanOrEqual(1);
});

test('contract call', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    await wallet.deploy({useGiver: true});

    const balanceSender = await tonux.getBalance(await wallet.getAddress());

    expect(balanceSender.toNumber()).toBeGreaterThan(1);

    const FAKE_RECEIVER_ADDRESS = '0:5ec3dbe83885261983b4c459b266e1e1333a0c62fff7e52f9e7492b5377fdf31';
    const TEST_AMOUNT = 0.111;

    const balanceReceiverBeforeSend = await tonux.getBalance(FAKE_RECEIVER_ADDRESS);

    await tonux.contractCall({
        keyPair: keypair,
        contractAddress: await wallet.getAddress(),
        abi: WalletContract.abi,
        methodName: 'sendTransaction',
        params: {
            dest: FAKE_RECEIVER_ADDRESS,
            value: tonux.tokenToNanoToken(new BigNumber(TEST_AMOUNT)).toString(),
            bounce: false,
            flags: 1,
            payload: ''
        }
    });

    const balanceReceiverAfterSend = await tonux.getBalance(FAKE_RECEIVER_ADDRESS);

    const ALLOWED_ERROR = 0.00001;
    const difference = tonux.nanoTokenToToken(balanceReceiverAfterSend.minus(balanceReceiverBeforeSend)).toNumber();

    expect(TEST_AMOUNT - difference).toBeLessThanOrEqual(ALLOWED_ERROR);
});
