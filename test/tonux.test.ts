import {AccountType, Tonux} from '../src';
import {libNode} from '@tonclient/lib-node';
import {TonClient} from '@tonclient/core';
import BigNumber from 'bignumber.js';

let tonux: Tonux;

beforeAll(() => {
    TonClient.useBinaryLibrary(libNode);
    tonux = new Tonux(['http://localhost']);
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
