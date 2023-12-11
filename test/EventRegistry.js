const { expect } = require('chai');
const { init } = require('./helpers/init.js');
const { snapshot, restore, getCurrentBlockTimestamp, toBN, increaseTime, getCosts } = require('./helpers/utils.js');
const { ADMIN_ROLE, ZERO_ADDRESS, RESULT } = require('./helpers/constants.js');

describe('EventRegistry', async () => {
  const args = process.env;

  let usdt, usdtAddress;
  let eventRegistry, eventRegistryAddress;

  let eventAddress;
  let eventAddress1;
  let eventAddress2;

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

    usdt = setups.usdt;
    usdtAddress = await usdt.getAddress();

    eventRegistry = setups.eventRegistry;
    eventRegistryAddress = await eventRegistry.getAddress();

    await eventRegistry.connect(owner).grantRole(ADMIN_ROLE, admin.address);

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
    beforeEach('setup', async () => {
      // create events
      let tx = await eventRegistry.connect(admin).createEvent();
      let receipt = await tx.wait();
      eventAddress1 = receipt.logs[0].args[0];

      tx = await eventRegistry.connect(admin).createEvent();
      receipt = await tx.wait();
      eventAddress2 = receipt.logs[0].args[0];
    });
    describe('setTokenAddress', async () => {
      it('set usdt token by default', async () => {
        expect(await eventRegistry.tokenAddress()).to.equal(usdtAddress);
      });
      it('set commission percentage by admin', async () => {
        const newTokenAddress = ZERO_ADDRESS;

        await eventRegistry.connect(admin).setTokenAddress(newTokenAddress);
        expect(await eventRegistry.tokenAddress()).to.equal(newTokenAddress);
      });
    });
    describe('enableBet', async () => {
      it('enabled by default', async () => {
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
    describe('setCommissionPercentage', async () => {
      it('set 10% commission percentage by default', async () => {
        expect(await eventRegistry.commissionPercentage()).to.equal(10);
      });
      it('set commission percentage by admin', async () => {
        const newCommissionPercentage = 25;

        await eventRegistry.connect(admin).setCommissionPercentage(newCommissionPercentage);
        expect(await eventRegistry.commissionPercentage()).to.equal(newCommissionPercentage);
      });
    });
  });
  describe('status', async () => {
    beforeEach('setup', async () => {
      // create events
      let tx = await eventRegistry.connect(admin).createEvent();
      let receipt = await tx.wait();
      eventAddress1 = receipt.logs[0].args[0];

      tx = await eventRegistry.connect(admin).createEvent();
      receipt = await tx.wait();
      eventAddress2 = receipt.logs[0].args[0];
    });
    it('can bet by default', async () => {
      expect(await eventRegistry.canBet(eventAddress1)).to.equal(true);
    });
    it('cannot bet if disabled', async () => {
      await eventRegistry.connect(admin).disableBet(eventAddress1);
      timestamp = await getCurrentBlockTimestamp();
      expect(await eventRegistry.stopBets(eventAddress1)).to.equal(timestamp);

      expect(await eventRegistry.canBet(eventAddress1)).to.equal(false);
    });
    it('can bet if disabled in future', async () => {
      const stopBets = toBN(await getCurrentBlockTimestamp())
        .plus(2 * 24 * 60 * 60)
        .toString();
      await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets);
      expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets);

      expect(await eventRegistry.canBet(eventAddress1)).to.equal(true);
    });
    it('can bet if enabled by admin', async () => {
      const stopBets = toBN(await getCurrentBlockTimestamp())
        .plus(2 * 24 * 60 * 60)
        .toString();
      await eventRegistry.connect(admin).disableBetAtDate(eventAddress1, stopBets);
      expect(await eventRegistry.stopBets(eventAddress1)).to.equal(stopBets);

      await eventRegistry.connect(admin).enableBet(eventAddress1);
      expect(await eventRegistry.canBet(eventAddress1)).to.equal(true);
    });
  });
  describe('createEvent', async () => {
    it('create 1 event successfully', async () => {
      let countEvents = await eventRegistry.countEvents();
      expect(countEvents).to.equal(0);

      let listEvents = await eventRegistry.listEvents(0, countEvents);
      expect(listEvents.length).to.equal(0);

      let countOpenEvents = await eventRegistry.countOpenEvents();
      expect(countOpenEvents).to.equal(0);

      let listOpenEvents = await eventRegistry.listOpenEvents(0, countOpenEvents);
      expect(listOpenEvents.length).to.equal(0);

      let tx = await eventRegistry.connect(admin).createEvent();
      let receipt = await tx.wait();
      const eventAddress = receipt.logs[0].args[0];

      countEvents = await eventRegistry.countEvents();
      expect(countEvents).to.equal(1);

      listEvents = await eventRegistry.listEvents(0, countEvents);
      expect(listEvents.length).to.equal(1);
      expect(listEvents[0]).to.equal(eventAddress);

      countOpenEvents = await eventRegistry.countOpenEvents();
      expect(countOpenEvents).to.equal(1);

      listOpenEvents = await eventRegistry.listOpenEvents(0, countOpenEvents);
      expect(listOpenEvents.length).to.equal(1);
      expect(listOpenEvents[0]).to.equal(eventAddress);
    });
    it('create 2 events successfully', async () => {
      let countEvents = await eventRegistry.countEvents();
      expect(countEvents).to.equal(0);

      let listEvents = await eventRegistry.listEvents(0, countEvents);
      expect(listEvents.length).to.equal(0);

      let countOpenEvents = await eventRegistry.countOpenEvents();
      expect(countOpenEvents).to.equal(0);

      let listOpenEvents = await eventRegistry.listOpenEvents(0, countOpenEvents);
      expect(listOpenEvents.length).to.equal(0);

      let tx = await eventRegistry.connect(admin).createEvent();
      let receipt = await tx.wait();
      const eventAddress1 = receipt.logs[0].args[0];

      tx = await eventRegistry.connect(admin).createEvent();
      receipt = await tx.wait();
      const eventAddress2 = receipt.logs[0].args[0];

      countEvents = await eventRegistry.countEvents();
      expect(countEvents).to.equal(2);

      listEvents = await eventRegistry.listEvents(0, countEvents);
      expect(listEvents.length).to.equal(2);
      expect(listEvents[0]).to.equal(eventAddress1);
      expect(listEvents[1]).to.equal(eventAddress2);

      countOpenEvents = await eventRegistry.countOpenEvents();
      expect(countOpenEvents).to.equal(2);

      listOpenEvents = await eventRegistry.listOpenEvents(0, countOpenEvents);
      expect(listOpenEvents.length).to.equal(2);
      expect(listOpenEvents[0]).to.equal(eventAddress1);
      expect(listOpenEvents[1]).to.equal(eventAddress2);
    });
    it('deploy new Event contract', async () => {
      const Event = await ethers.getContractFactory('EventMock');

      let tx = await eventRegistry.connect(admin).createEvent();
      let receipt = await tx.wait();
      const eventAddress = receipt.logs[0].args[0];
      const event = Event.attach(eventAddress);

      expect(await event.eventRegistry()).to.equal(eventRegistryAddress);
    });
    it('emit EventCreated event', async () => {
      await expect(eventRegistry.connect(admin).createEvent()).to.emit(eventRegistry, 'EventCreated');
    });
  });
  describe('endEvent', async () => {});
  describe('cancelEvent', async () => {});
  describe('gas cost', async () => {
    let tx;
    it('createEvent', async () => {
      tx = await eventRegistry.connect(admin).createEvent();
      await getCosts(tx);
    });
    it('endEvent - not draw', async () => {
      tx = await eventRegistry.connect(admin).createEvent();
      receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[0];

      tx = await eventRegistry.connect(admin).endEvent(eventAddress, RESULT.WIN_A);
      await getCosts(tx);
    });
    it('endEvent - draw', async () => {
      tx = await eventRegistry.connect(admin).createEvent();
      receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[0];

      tx = await eventRegistry.connect(admin).endEvent(eventAddress, RESULT.DRAW);
      await getCosts(tx);
    });
    it('cancelEvent', async () => {
      tx = await eventRegistry.connect(admin).createEvent();
      receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[0];

      tx = await eventRegistry.connect(admin).cancelEvent(eventAddress);
      await getCosts(tx);
    });
  });
});
