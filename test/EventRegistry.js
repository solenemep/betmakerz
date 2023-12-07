const { expect } = require('chai');
const { init } = require('./helpers/init.js');
const {
  snapshot,
  restore,
  ADMIN_ROLE,
  getCurrentBlockTimestamp,
  toBN,
  increaseTimeTo,
  increaseTime,
} = require('./helpers/utils.js');

describe('EventRegistry', async () => {
  const args = process.env;

  let eventRegistry, eventRegistryAddress;

  let event1, eventAddress1;
  let event2, eventAddress2;

  let owner;
  let user1, user2, user3;
  let admin;

  let timestamp;

  before('setup', async () => {
    const setups = await init();

    owner = setups.users[0];
    user1 = setups.users[1];
    user2 = setups.users[2];
    user3 = setups.users[3];
    admin = setups.users[4];

    eventRegistry = setups.eventRegistry;
    eventRegistryAddress = await eventRegistry.getAddress();

    await eventRegistry.connect(owner).grantRole(ADMIN_ROLE, admin.address);

    // create events
    const Event = await ethers.getContractFactory('EventMock');

    let tx = await eventRegistry.connect(admin).createEvent();
    let receipt = await tx.wait();
    eventAddress1 = receipt.logs[0].args[0];
    event1 = await Event.attach(eventAddress1);

    tx = await eventRegistry.connect(admin).createEvent();
    receipt = await tx.wait();
    eventAddress2 = receipt.logs[0].args[0];
    event2 = await Event.attach(eventAddress2);

    await snapshot();
  });

  afterEach('revert', async () => {
    await restore();
  });

  describe('deployment', async () => {
    it('deploy contract successfully', async () => {
      expect(await eventRegistry.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
    });
    it('upgrade contract successfully', async () => {
      const EventRegistryMock = await ethers.getContractFactory('EventRegistryMock2');
      eventRegistry = await upgrades.upgradeProxy(await eventRegistry.getAddress(), EventRegistryMock);
      console.log('EventRegistry upgraded at : ', await eventRegistry.getAddress());

      expect(await eventRegistry.random()).to.equal(24102023);
    });
  });
  describe('settings', async () => {
    describe('enableBet', async () => {
      it('is enabled by default', async () => {
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(0);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(0);
      });
      it('do nothing if enabled', async () => {
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(0);

        await eventRegistry.connect(admin).enableBet(eventAddress1);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(0);
      });
      it('enable bet if disabled', async () => {
        await eventRegistry.connect(admin).disableBet(eventAddress1);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);

        await eventRegistry.connect(admin).enableBet(eventAddress1);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(0);
      });
    });
    describe('disableBet', async () => {
      it('disable bet if enabled', async () => {
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(0);

        await eventRegistry.connect(admin).disableBet(eventAddress1);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);
      });
      it('disable bet if enabled until future date', async () => {
        const stopBets = toBN(await getCurrentBlockTimestamp())
          .plus(8 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets);

        await eventRegistry.connect(admin).disableBet(eventAddress1);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);
      });
      it('do nothing if disabled in past', async () => {
        await eventRegistry.connect(admin).disableBet(eventAddress1);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);

        await increaseTime(2 * 24 * 60 * 60);
        await eventRegistry.connect(admin).disableBet(eventAddress1);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);
      });
    });
    describe('disableBetAtDate', async () => {
      it('do nothing if date is in past', async () => {
        const stopBets = await getCurrentBlockTimestamp();
        await increaseTime(2 * 24 * 60 * 60);

        await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(0);
      });
      it('disable bet at date if enabled', async () => {
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(0);

        const stopBets = toBN(await getCurrentBlockTimestamp())
          .plus(8 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets);
      });
      it('disable bet at date if enabled until future date - new date < ex date', async () => {
        const stopBets1 = toBN(await getCurrentBlockTimestamp())
          .plus(8 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets1);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets1);

        const stopBets2 = toBN(await getCurrentBlockTimestamp())
          .plus(3 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets2);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets2);
      });
      it('disable bet at date if enabled until future date - new date > ex date', async () => {
        const stopBets1 = toBN(await getCurrentBlockTimestamp())
          .plus(2 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets1);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets1);

        const stopBets2 = toBN(await getCurrentBlockTimestamp())
          .plus(7 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets2);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets2);
      });
      it('do nothing if disabled in past', async () => {
        await eventRegistry.connect(admin).disableBet(eventAddress1);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);

        await increaseTime(2 * 24 * 60 * 60);
        const stopBets = toBN(await getCurrentBlockTimestamp())
          .plus(3 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets);
        expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);
      });
    });
  });
  describe('status', async () => {
    it('can bet by default', async () => {
      expect(await eventRegistry.canBetMock(eventAddress1)).to.equal(true);
    });
    it('cannot bet if disabled', async () => {
      await eventRegistry.connect(admin).disableBet(eventAddress1);
      timestamp = await getCurrentBlockTimestamp();
      expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);

      expect(await eventRegistry.canBetMock(eventAddress1)).to.equal(false);
    });
    it('can bet if disabled in future', async () => {
      const stopBets = toBN(await getCurrentBlockTimestamp())
        .plus(2 * 24 * 60 * 60)
        .toString();
      await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets);
      expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets);

      expect(await eventRegistry.canBetMock(eventAddress1)).to.equal(true);
    });
    it('can bet if enabled by admin', async () => {
      const stopBets = toBN(await getCurrentBlockTimestamp())
        .plus(2 * 24 * 60 * 60)
        .toString();
      await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets);
      expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets);

      await eventRegistry.connect(admin).enableBet(eventAddress1);
      expect(await eventRegistry.canBetMock(eventAddress1)).to.equal(true);
    });
  });
});
