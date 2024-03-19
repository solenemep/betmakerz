const { expect } = require('chai');
const { init } = require('./helpers/init.js');
const {
  snapshot,
  restore,
  getCurrentBlockTimestamp,
  toBN,
  increaseTime,
  getCosts,
  toWei,
} = require('./helpers/utils.js');
const { ADMIN_ROLE, ZERO_ADDRESS } = require('./helpers/constants.js');

describe('EventRegistry', async () => {
  const args = process.env;

  let usdt, usdtAddress;
  let eventRegistry, eventRegistryAddress;

  let event, eventAddress;
  let event1, eventAddress1;
  let event2, eventAddress2;

  let owner;
  let user1, user2, user3;
  let admin;

  let timestamp;
  let nbTeam;
  let betAmount, minBetAmount, partnerID;

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

    nbTeam = 8;
    minBetAmount = toWei('2');
    betAmount = toWei('10');
    partnerID = 1;

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
    let creationDate;
    beforeEach('setup', async () => {
      let tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      creationDate = await getCurrentBlockTimestamp();
      let receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];
    });
    describe('setTokenAddress', async () => {
      it('set usdt token by default', async () => {
        expect(await eventRegistry.tokenAddress()).to.equal(usdtAddress);
      });
      it('set token address by admin', async () => {
        const newTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

        await eventRegistry.connect(admin).setTokenAddress(newTokenAddress);
        expect(await eventRegistry.tokenAddress()).to.equal(newTokenAddress);
      });
      it('revert if address zero', async () => {
        const reason = 'WrongTokenAddress';

        await expect(eventRegistry.connect(admin).setTokenAddress(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          eventRegistry,
          reason,
        );
      });
    });
    describe('setOwnerAddress', async () => {
      it('set owner address by default', async () => {
        expect(await eventRegistry.ownerAddress()).to.equal(owner.address);
      });
      it('set owner address by admin', async () => {
        const newOwnerAddress = user1.address;

        await eventRegistry.connect(admin).setOwnerAddress(newOwnerAddress);
        expect(await eventRegistry.ownerAddress()).to.equal(newOwnerAddress);
      });
      it('revert if address zero', async () => {
        const reason = 'WrongOwnerAddress';

        await expect(eventRegistry.connect(admin).setOwnerAddress(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          eventRegistry,
          reason,
        );
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
      it('revert if wrong commission percentage', async () => {
        const reason = 'WrongCommissionPercentage';

        await expect(eventRegistry.connect(admin).setCommissionPercentage(0)).to.be.revertedWithCustomError(
          eventRegistry,
          reason,
        );
        await expect(eventRegistry.connect(admin).setCommissionPercentage(60)).to.be.revertedWithCustomError(
          eventRegistry,
          reason,
        );
      });
    });
    describe('setDeadline', async () => {
      let event;
      beforeEach('setup', async () => {
        const Event = await ethers.getContractFactory('Event');
        event = Event.attach(eventAddress);
      });
      it('set 1 year deadline by default', async () => {
        expect(await event.deadline()).to.equal(
          toBN(creationDate)
            .plus(52 * 7 * 24 * 60 * 60)
            .toString(),
        );
      });
      it('set deadline by admin', async () => {
        const newDeadline = toBN(creationDate)
          .plus(58 * 7 * 24 * 60 * 60)
          .toString();

        await eventRegistry.connect(admin).setDeadline(eventAddress, newDeadline);
        expect(await event.deadline()).to.equal(newDeadline);
      });
      it('revert if wrong deadline', async () => {
        const reason = 'WrongDealine';

        const currentTime = await getCurrentBlockTimestamp();

        await expect(eventRegistry.connect(admin).setDeadline(eventAddress, 0)).to.be.revertedWithCustomError(
          event,
          reason,
        );
        await expect(
          eventRegistry.connect(admin).setDeadline(eventAddress, toBN(currentTime).minus(60).toString()),
        ).to.be.revertedWithCustomError(event, reason);
      });
    });
    describe('enableBet', async () => {
      it('enabled by default', async () => {
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(0);
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(0);
      });
      it('enable bet if disabled', async () => {
        await eventRegistry.connect(admin).disableBet(eventAddress);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(timestamp);

        await eventRegistry.connect(admin).enableBet(eventAddress);
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(0);
      });
      it('revert if enabled', async () => {
        const reason = 'CannotConfigurate';

        expect(await eventRegistry.stopBets(eventAddress)).to.equal(0);

        await expect(eventRegistry.connect(admin).enableBet(eventAddress)).to.be.revertedWithCustomError(
          eventRegistry,
          reason,
        );

        expect(await eventRegistry.stopBets(eventAddress)).to.equal(0);
      });
    });
    describe('disableBet', async () => {
      it('disable bet if enabled', async () => {
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(0);

        await eventRegistry.connect(admin).disableBet(eventAddress);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(timestamp);
      });
      it('disable bet if enabled until future date', async () => {
        const stopBets = toBN(await getCurrentBlockTimestamp())
          .plus(8 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets);
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(stopBets);

        await eventRegistry.connect(admin).disableBet(eventAddress);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(timestamp);
      });
      it('revert if disabled in past', async () => {
        const reason = 'CannotConfigurate';

        await eventRegistry.connect(admin).disableBet(eventAddress);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(timestamp);

        await increaseTime(2 * 24 * 60 * 60);
        await expect(eventRegistry.connect(admin).disableBet(eventAddress)).to.be.revertedWithCustomError(
          eventRegistry,
          reason,
        );

        expect(await eventRegistry.stopBets(eventAddress)).to.equal(timestamp);
      });
    });
    describe('disableBetAtDate', async () => {
      it('disable bet at date if enabled', async () => {
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(0);

        const stopBets = toBN(await getCurrentBlockTimestamp())
          .plus(8 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets);
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(stopBets);
      });
      it('disable bet at date if enabled until future date - new date < ex date', async () => {
        const stopBets1 = toBN(await getCurrentBlockTimestamp())
          .plus(8 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets1);
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(stopBets1);

        const stopBets2 = toBN(await getCurrentBlockTimestamp())
          .plus(3 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets2);
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(stopBets2);
      });
      it('disable bet at date if enabled until future date - new date > ex date', async () => {
        const stopBets1 = toBN(await getCurrentBlockTimestamp())
          .plus(2 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets1);
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(stopBets1);

        const stopBets2 = toBN(await getCurrentBlockTimestamp())
          .plus(7 * 24 * 60 * 60)
          .toString();
        await eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets2);
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(stopBets2);
      });
      it('revert if date is in past', async () => {
        const reason = 'CannotConfigurate';

        const stopBets = await getCurrentBlockTimestamp();
        await increaseTime(2 * 24 * 60 * 60);
        await expect(
          eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets),
        ).to.be.revertedWithCustomError(eventRegistry, reason);

        expect(await eventRegistry.stopBets(eventAddress)).to.equal(0);
      });
      it('revert if disabled in past', async () => {
        const reason = 'CannotConfigurate';

        await eventRegistry.connect(admin).disableBet(eventAddress);
        timestamp = await getCurrentBlockTimestamp();
        expect(await eventRegistry.stopBets(eventAddress)).to.equal(timestamp);

        await increaseTime(2 * 24 * 60 * 60);
        const stopBets = toBN(await getCurrentBlockTimestamp())
          .plus(3 * 24 * 60 * 60)
          .toString();
        await expect(
          eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets),
        ).to.be.revertedWithCustomError(eventRegistry, reason);

        expect(await eventRegistry.stopBets(eventAddress)).to.equal(timestamp);
      });
    });
  });
  describe('canBet', async () => {
    beforeEach('setup', async () => {
      let tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      let receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];
    });
    it('can bet by default', async () => {
      expect(await eventRegistry.canBet(eventAddress)).to.equal(true);
    });
    it('cannot bet if disabled', async () => {
      await eventRegistry.connect(admin).disableBet(eventAddress);
      timestamp = await getCurrentBlockTimestamp();
      expect(await eventRegistry.stopBets(eventAddress)).to.equal(timestamp);

      expect(await eventRegistry.canBet(eventAddress)).to.equal(false);
    });
    it('can bet if disabled in future', async () => {
      const stopBets = toBN(await getCurrentBlockTimestamp())
        .plus(2 * 24 * 60 * 60)
        .toString();
      await eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets);
      expect(await eventRegistry.stopBets(eventAddress)).to.equal(stopBets);

      expect(await eventRegistry.canBet(eventAddress)).to.equal(true);
    });
    it('can bet if enabled by admin', async () => {
      const stopBets = toBN(await getCurrentBlockTimestamp())
        .plus(2 * 24 * 60 * 60)
        .toString();
      await eventRegistry.connect(admin).disableBetAtDate(eventAddress, stopBets);
      expect(await eventRegistry.stopBets(eventAddress)).to.equal(stopBets);

      await eventRegistry.connect(admin).enableBet(eventAddress);
      expect(await eventRegistry.canBet(eventAddress)).to.equal(true);
    });
    it('cannot bet if ended', async () => {
      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      expect(await eventRegistry.canBet(eventAddress)).to.equal(false);
    });
    it('cannot bet if canceled', async () => {
      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      expect(await eventRegistry.canBet(eventAddress)).to.equal(false);
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

      let tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      let receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];

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

      let tx = await eventRegistry.connect(admin).createEvent(1, minBetAmount, nbTeam);
      let receipt = await tx.wait();
      eventAddress1 = receipt.logs[0].args[1];

      tx = await eventRegistry.connect(admin).createEvent(2, minBetAmount, nbTeam);
      receipt = await tx.wait();
      eventAddress2 = receipt.logs[0].args[1];

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
      const Event = await ethers.getContractFactory('Event');

      let tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      let receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];
      event = Event.attach(eventAddress);

      expect(await event.eventRegistry()).to.equal(eventRegistryAddress);
    });
    it('revert if wrong nbTeam', async () => {
      const reason = 'WrongNbTeam';

      await expect(eventRegistry.connect(admin).createEvent(0, minBetAmount, 1)).to.be.revertedWithCustomError(
        eventRegistry,
        reason,
      );
      await expect(eventRegistry.connect(admin).createEvent(0, minBetAmount, 32)).to.be.revertedWithCustomError(
        eventRegistry,
        reason,
      );
    });
    it('emit EventCreated event', async () => {
      await expect(eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam)).to.emit(
        eventRegistry,
        'EventCreated',
      );
    });
  });
  describe('cancelEvent', async () => {
    beforeEach('setup', async () => {
      const Event = await ethers.getContractFactory('Event');

      let tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      let receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];
      event = Event.attach(eventAddress);
    });
    it('cancel event successfully', async () => {
      let countEvents = await eventRegistry.countEvents();
      expect(countEvents).to.equal(1);

      let listEvents = await eventRegistry.listEvents(0, countEvents);
      expect(listEvents.length).to.equal(1);
      expect(listEvents[0]).to.equal(eventAddress);

      let countOpenEvents = await eventRegistry.countOpenEvents();
      expect(countOpenEvents).to.equal(1);

      let listOpenEvents = await eventRegistry.listOpenEvents(0, countOpenEvents);
      expect(listOpenEvents.length).to.equal(1);
      expect(listOpenEvents[0]).to.equal(eventAddress);

      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      countEvents = await eventRegistry.countEvents();
      expect(countEvents).to.equal(1);

      listEvents = await eventRegistry.listEvents(0, countEvents);
      expect(listEvents.length).to.equal(1);
      expect(listEvents[0]).to.equal(eventAddress);

      countOpenEvents = await eventRegistry.countOpenEvents();
      expect(countOpenEvents).to.equal(0);

      listOpenEvents = await eventRegistry.listOpenEvents(0, countOpenEvents);
      expect(listOpenEvents.length).to.equal(0);
    });
    it('revert if already closed - ended', async () => {
      const reason = 'AlreadyClosed';

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);
      await expect(eventRegistry.connect(admin).cancelEvent(eventAddress)).to.be.revertedWithCustomError(
        eventRegistry,
        reason,
      );
    });
    it('revert if already closed - canceled', async () => {
      const reason = 'AlreadyClosed';

      await eventRegistry.connect(admin).cancelEvent(eventAddress);
      await expect(eventRegistry.connect(admin).cancelEvent(eventAddress)).to.be.revertedWithCustomError(
        eventRegistry,
        reason,
      );
    });
    it('emit EventCancelled event', async () => {
      await expect(eventRegistry.connect(admin).cancelEvent(eventAddress))
        .to.emit(eventRegistry, 'EventCancelled')
        .withArgs(eventAddress);
    });
  });
  describe('endEvent', async () => {
    beforeEach('setup', async () => {
      const Event = await ethers.getContractFactory('Event');

      let tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      let receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];
      event = Event.attach(eventAddress);
    });
    it('end event successfully', async () => {
      let countEvents = await eventRegistry.countEvents();
      expect(countEvents).to.equal(1);

      let listEvents = await eventRegistry.listEvents(0, countEvents);
      expect(listEvents.length).to.equal(1);
      expect(listEvents[0]).to.equal(eventAddress);

      let countOpenEvents = await eventRegistry.countOpenEvents();
      expect(countOpenEvents).to.equal(1);

      let listOpenEvents = await eventRegistry.listOpenEvents(0, countOpenEvents);
      expect(listOpenEvents.length).to.equal(1);
      expect(listOpenEvents[0]).to.equal(eventAddress);

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      countEvents = await eventRegistry.countEvents();
      expect(countEvents).to.equal(1);

      listEvents = await eventRegistry.listEvents(0, countEvents);
      expect(listEvents.length).to.equal(1);
      expect(listEvents[0]).to.equal(eventAddress);

      countOpenEvents = await eventRegistry.countOpenEvents();
      expect(countOpenEvents).to.equal(0);

      listOpenEvents = await eventRegistry.listOpenEvents(0, countOpenEvents);
      expect(listOpenEvents.length).to.equal(0);
    });
    it('revert if already closed - ended', async () => {
      const reason = 'AlreadyClosed';

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);
      await expect(eventRegistry.connect(admin).endEvent(eventAddress, 1)).to.be.revertedWithCustomError(
        eventRegistry,
        reason,
      );
    });
    it('revert if already closed - canceled', async () => {
      const reason = 'AlreadyClosed';

      await eventRegistry.connect(admin).cancelEvent(eventAddress);
      await expect(eventRegistry.connect(admin).endEvent(eventAddress, 1)).to.be.revertedWithCustomError(
        eventRegistry,
        reason,
      );
    });
    it('emit EventEnded event', async () => {
      await expect(eventRegistry.connect(admin).endEvent(eventAddress, 1))
        .to.emit(eventRegistry, 'EventEnded')
        .withArgs(eventAddress, 1);
    });
  });
  describe('gas cost', async () => {
    let tx;
    it('createEvent', async () => {
      tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      await getCosts(tx);
    });
    it('cancelEvent', async () => {
      tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];

      await usdt.connect(owner).transfer(user1.address, toWei('1000'));
      await usdt.connect(owner).transfer(user2.address, toWei('1000'));
      await usdt.connect(owner).transfer(user3.address, toWei('1000'));

      await usdt.connect(user1).approve(eventAddress, toWei('1000'));
      await usdt.connect(user2).approve(eventAddress, toWei('1000'));
      await usdt.connect(user3).approve(eventAddress, toWei('1000'));

      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user1).placeBet(2, betAmount, partnerID);
      await event.connect(user1).placeBet(3, betAmount, partnerID);

      await event.connect(user2).placeBet(1, betAmount, partnerID);
      await event.connect(user2).placeBet(2, betAmount, partnerID);
      await event.connect(user2).placeBet(3, betAmount, partnerID);

      await event.connect(user3).placeBet(1, betAmount, partnerID);
      await event.connect(user3).placeBet(2, betAmount, partnerID);
      await event.connect(user3).placeBet(3, betAmount, partnerID);

      tx = await eventRegistry.connect(admin).cancelEvent(eventAddress);
      await getCosts(tx);
    });
    it('endEvent - DRAW', async () => {
      tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];

      await usdt.connect(owner).transfer(user1.address, toWei('1000'));
      await usdt.connect(owner).transfer(user2.address, toWei('1000'));
      await usdt.connect(owner).transfer(user3.address, toWei('1000'));

      await usdt.connect(user1).approve(eventAddress, toWei('1000'));
      await usdt.connect(user2).approve(eventAddress, toWei('1000'));
      await usdt.connect(user3).approve(eventAddress, toWei('1000'));

      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user1).placeBet(2, betAmount, partnerID);
      await event.connect(user1).placeBet(3, betAmount, partnerID);

      await event.connect(user2).placeBet(1, betAmount, partnerID);
      await event.connect(user2).placeBet(2, betAmount, partnerID);
      await event.connect(user2).placeBet(3, betAmount, partnerID);

      await event.connect(user3).placeBet(1, betAmount, partnerID);
      await event.connect(user3).placeBet(2, betAmount, partnerID);
      await event.connect(user3).placeBet(3, betAmount, partnerID);

      tx = await eventRegistry.connect(admin).endEvent(eventAddress, 0);
      await getCosts(tx);
    });
    it('endEvent - WIN', async () => {
      tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];

      await usdt.connect(owner).transfer(user1.address, toWei('1000'));
      await usdt.connect(owner).transfer(user2.address, toWei('1000'));
      await usdt.connect(owner).transfer(user3.address, toWei('1000'));

      await usdt.connect(user1).approve(eventAddress, toWei('1000'));
      await usdt.connect(user2).approve(eventAddress, toWei('1000'));
      await usdt.connect(user3).approve(eventAddress, toWei('1000'));

      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user1).placeBet(2, betAmount, partnerID);
      await event.connect(user1).placeBet(3, betAmount, partnerID);

      await event.connect(user2).placeBet(1, betAmount, partnerID);
      await event.connect(user2).placeBet(2, betAmount, partnerID);
      await event.connect(user2).placeBet(3, betAmount, partnerID);

      await event.connect(user3).placeBet(1, betAmount, partnerID);
      await event.connect(user3).placeBet(2, betAmount, partnerID);
      await event.connect(user3).placeBet(3, betAmount, partnerID);

      tx = await eventRegistry.connect(admin).endEvent(eventAddress, 1);
      await getCosts(tx);
    });
    it('endEvent - WIN : winner pool empty', async () => {
      tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
      receipt = await tx.wait();
      eventAddress = receipt.logs[0].args[1];

      await usdt.connect(owner).transfer(user1.address, toWei('1000'));
      await usdt.connect(owner).transfer(user2.address, toWei('1000'));
      await usdt.connect(owner).transfer(user3.address, toWei('1000'));

      await usdt.connect(user1).approve(eventAddress, toWei('1000'));
      await usdt.connect(user2).approve(eventAddress, toWei('1000'));
      await usdt.connect(user3).approve(eventAddress, toWei('1000'));

      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user1).placeBet(2, betAmount, partnerID);
      await event.connect(user1).placeBet(2, betAmount, partnerID);

      await event.connect(user2).placeBet(1, betAmount, partnerID);
      await event.connect(user2).placeBet(2, betAmount, partnerID);
      await event.connect(user2).placeBet(2, betAmount, partnerID);

      await event.connect(user3).placeBet(1, betAmount, partnerID);
      await event.connect(user3).placeBet(2, betAmount, partnerID);
      await event.connect(user3).placeBet(2, betAmount, partnerID);

      tx = await eventRegistry.connect(admin).endEvent(eventAddress, 3);
      await getCosts(tx);
    });
  });
});
