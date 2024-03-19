const { expect } = require('chai');
const { init } = require('./helpers/init.js');
const {
  snapshot,
  restore,
  toWei,
  getCosts,
  toBN,
  increaseTimeTo,
  getCurrentBlockTimestamp,
} = require('./helpers/utils.js');
const { ADMIN_ROLE, RESULT } = require('./helpers/constants.js');

describe('Event', async () => {
  const args = process.env;

  let usdt, usdtAddress;
  let eventRegistry, eventRegistryAddress;

  let event, eventAddress;

  let owner;
  let user1, user2, user3, user4, user5, user6;
  let admin;

  let nbTeam;
  let betAmount, minBetAmount, partnerID;

  let creationDate;

  before('setup', async () => {
    const setups = await init();

    owner = setups.users[0];
    user1 = setups.users[1];
    user2 = setups.users[2];
    user3 = setups.users[3];
    user4 = setups.users[4];
    user5 = setups.users[5];
    user6 = setups.users[6];
    admin = setups.users[7];

    usdt = setups.usdt;
    usdtAddress = await usdt.getAddress();

    eventRegistry = setups.eventRegistry;
    eventRegistryAddress = await eventRegistry.getAddress();

    nbTeam = 6;
    minBetAmount = toWei('2');
    betAmount = toWei('10');
    partnerID = 1;

    await eventRegistry.connect(owner).grantRole(ADMIN_ROLE, admin.address);

    const Event = await ethers.getContractFactory('Event');

    let tx = await eventRegistry.connect(admin).createEvent(0, minBetAmount, nbTeam);
    creationDate = await getCurrentBlockTimestamp();
    let receipt = await tx.wait();
    eventAddress = receipt.logs[0].args[1];
    event = Event.attach(eventAddress);

    await usdt.connect(owner).transfer(user1.address, toWei('1000'));
    await usdt.connect(owner).transfer(user2.address, toWei('1000'));
    await usdt.connect(owner).transfer(user3.address, toWei('1000'));
    await usdt.connect(owner).transfer(user4.address, toWei('1000'));
    await usdt.connect(owner).transfer(user5.address, toWei('1000'));
    await usdt.connect(owner).transfer(user6.address, toWei('1000'));

    await usdt.connect(user1).approve(eventAddress, toWei('1000'));
    await usdt.connect(user2).approve(eventAddress, toWei('1000'));
    await usdt.connect(user3).approve(eventAddress, toWei('1000'));
    await usdt.connect(user4).approve(eventAddress, toWei('1000'));
    await usdt.connect(user5).approve(eventAddress, toWei('1000'));
    await usdt.connect(user6).approve(eventAddress, toWei('1000'));

    await snapshot();
  });

  afterEach('revert', async () => {
    await restore();
  });

  describe('deployment', async () => {
    it('deploy contract successfully', async () => {
      expect(await event.token()).to.equal(usdtAddress);
      expect(await event.eventRegistry()).to.equal(eventRegistryAddress);
      expect(await event.commissionPercentage()).to.equal(await eventRegistry.commissionPercentage());
      expect(await event.minBetAmount()).to.equal(minBetAmount);
      expect(await event.nbTeam()).to.equal(nbTeam);

      expect(await eventRegistry.canBet(eventAddress)).to.equal(true);
      console.log('Event deployed at : ', eventAddress);
    });
  });
  describe('placeBet', async () => {
    it('place 1 bet successfully - team', async () => {
      let countBettorsPerPool1 = await event.countBettorsPerPool(1);
      expect(countBettorsPerPool1).to.equal(0);
      let listBettorsPerPool1 = await event.listBettorsPerPool(0, countBettorsPerPool1, 1);
      expect(listBettorsPerPool1.length).to.equal(0);

      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(0);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(0);

      expect(await event.treasury(1)).to.equal(0);
      expect(await event.betAmount(1, user1.address)).to.equal(0);

      await event.connect(user1).placeBet(1, betAmount, partnerID);

      countBettorsPerPool1 = await event.countBettorsPerPool(1);
      expect(countBettorsPerPool1).to.equal(1);
      listBettorsPerPool1 = await event.listBettorsPerPool(0, countBettorsPerPool1, 1);
      expect(listBettorsPerPool1.length).to.equal(1);
      expect(listBettorsPerPool1[0]).to.equal(user1.address);

      countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);

      expect(await event.treasury(1)).to.equal(betAmount);
      expect(await event.betAmount(1, user1.address)).to.equal(betAmount);
    });
    it('place 1 bet successfully - draw', async () => {
      let countBettorsPerPool0 = await event.countBettorsPerPool(0);
      expect(countBettorsPerPool0).to.equal(0);
      let listBettorsPerPool0 = await event.listBettorsPerPool(0, countBettorsPerPool0, 1);
      expect(listBettorsPerPool0.length).to.equal(0);

      let countPartnerIDs0 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs0).to.equal(0);
      let listPartnerIDs0 = await event.listPartnerIDs(0, countPartnerIDs0, user1.address);
      expect(listPartnerIDs0.length).to.equal(0);

      expect(await event.treasury(1)).to.equal(0);
      expect(await event.betAmount(1, user1.address)).to.equal(0);

      await event.connect(user1).placeBet(0, betAmount, partnerID);

      countBettorsPerPool0 = await event.countBettorsPerPool(0);
      expect(countBettorsPerPool0).to.equal(1);
      listBettorsPerPool0 = await event.listBettorsPerPool(0, countBettorsPerPool0, 0);
      expect(listBettorsPerPool0.length).to.equal(1);
      expect(listBettorsPerPool0[0]).to.equal(user1.address);

      countPartnerIDs0 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs0).to.equal(1);
      listPartnerIDs0 = await event.listPartnerIDs(0, countPartnerIDs0, user1.address);
      expect(listPartnerIDs0.length).to.equal(1);
      expect(listPartnerIDs0[0]).to.equal(partnerID);

      expect(await event.treasury(0)).to.equal(betAmount);
      expect(await event.betAmount(0, user1.address)).to.equal(betAmount);
    });
    it('transfer tokens - team', async () => {
      expect(await usdt.balanceOf(user1.address)).to.equal(toWei('1000'));
      expect(await usdt.balanceOf(eventAddress)).to.equal(0);

      await event.connect(user1).placeBet(1, betAmount, partnerID);

      expect(await usdt.balanceOf(user1.address)).to.equal(toBN(toWei('1000')).minus(betAmount));
      expect(await usdt.balanceOf(eventAddress)).to.equal(betAmount);
    });
    it('transfer tokens - draw', async () => {
      expect(await usdt.balanceOf(user1.address)).to.equal(toWei('1000'));
      expect(await usdt.balanceOf(eventAddress)).to.equal(0);

      await event.connect(user1).placeBet(0, betAmount, partnerID);

      expect(await usdt.balanceOf(user1.address)).to.equal(toBN(toWei('1000')).minus(betAmount));
      expect(await usdt.balanceOf(eventAddress)).to.equal(betAmount);
    });
    it('place 3 bets successfully - same user / same pool', async () => {
      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user1).placeBet(1, betAmount, partnerID);

      let countBettorsPerPool1 = await event.countBettorsPerPool(1);
      expect(countBettorsPerPool1).to.equal(1);
      let listBettorsPerPool1 = await event.listBettorsPerPool(0, countBettorsPerPool1, 1);
      expect(listBettorsPerPool1.length).to.equal(1);
      expect(listBettorsPerPool1[0]).to.equal(user1.address);

      let countBettorsPerPool2 = await event.countBettorsPerPool(2);
      expect(countBettorsPerPool2).to.equal(0);
      let listBettorsPerPool2 = await event.listBettorsPerPool(0, countBettorsPerPool2, 2);
      expect(listBettorsPerPool2.length).to.equal(0);

      let countBettorsPerPool3 = await event.countBettorsPerPool(3);
      expect(countBettorsPerPool3).to.equal(0);
      let listBettorsPerPool3 = await event.listBettorsPerPool(0, countBettorsPerPool3, 3);
      expect(listBettorsPerPool3.length).to.equal(0);

      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);

      let countPartnerIDs2 = await event.countPartnerIDs(user2.address);
      expect(countPartnerIDs2).to.equal(0);
      let listPartnerIDs2 = await event.listPartnerIDs(0, countPartnerIDs2, user2.address);
      expect(listPartnerIDs2.length).to.equal(0);

      let countPartnerIDs3 = await event.countPartnerIDs(user3.address);
      expect(countPartnerIDs3).to.equal(0);
      let listPartnerIDs3 = await event.listPartnerIDs(0, countPartnerIDs3, user3.address);
      expect(listPartnerIDs3.length).to.equal(0);

      expect(await event.treasury(1)).to.equal(toBN(betAmount).times(3));
      expect(await event.treasury(2)).to.equal(0);
      expect(await event.treasury(3)).to.equal(0);

      expect(await event.betAmount(1, user1.address)).to.equal(toBN(betAmount).times(3));
      expect(await event.betAmount(1, user2.address)).to.equal(0);
      expect(await event.betAmount(1, user3.address)).to.equal(0);

      expect(await event.betAmount(2, user1.address)).to.equal(0);
      expect(await event.betAmount(2, user2.address)).to.equal(0);
      expect(await event.betAmount(2, user3.address)).to.equal(0);

      expect(await event.betAmount(3, user1.address)).to.equal(0);
      expect(await event.betAmount(3, user2.address)).to.equal(0);
      expect(await event.betAmount(3, user3.address)).to.equal(0);
    });
    it('place 3 bets successfully - same user / different pool', async () => {
      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user1).placeBet(2, betAmount, partnerID);
      await event.connect(user1).placeBet(3, betAmount, partnerID);

      let countBettorsPerPool1 = await event.countBettorsPerPool(1);
      expect(countBettorsPerPool1).to.equal(1);
      let listBettorsPerPool1 = await event.listBettorsPerPool(0, countBettorsPerPool1, 1);
      expect(listBettorsPerPool1.length).to.equal(1);
      expect(listBettorsPerPool1[0]).to.equal(user1.address);

      let countBettorsPerPool2 = await event.countBettorsPerPool(2);
      expect(countBettorsPerPool2).to.equal(1);
      let listBettorsPerPool2 = await event.listBettorsPerPool(0, countBettorsPerPool2, 2);
      expect(listBettorsPerPool2.length).to.equal(1);
      expect(listBettorsPerPool2[0]).to.equal(user1.address);

      let countBettorsPerPool3 = await event.countBettorsPerPool(3);
      expect(countBettorsPerPool3).to.equal(1);
      let listBettorsPerPool3 = await event.listBettorsPerPool(0, countBettorsPerPool3, 3);
      expect(listBettorsPerPool3.length).to.equal(1);
      expect(listBettorsPerPool3[0]).to.equal(user1.address);

      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);

      let countPartnerIDs2 = await event.countPartnerIDs(user2.address);
      expect(countPartnerIDs2).to.equal(0);
      let listPartnerIDs2 = await event.listPartnerIDs(0, countPartnerIDs2, user2.address);
      expect(listPartnerIDs2.length).to.equal(0);

      let countPartnerIDs3 = await event.countPartnerIDs(user3.address);
      expect(countPartnerIDs3).to.equal(0);
      let listPartnerIDs3 = await event.listPartnerIDs(0, countPartnerIDs3, user3.address);
      expect(listPartnerIDs3.length).to.equal(0);

      expect(await event.treasury(1)).to.equal(betAmount);
      expect(await event.treasury(2)).to.equal(betAmount);
      expect(await event.treasury(3)).to.equal(betAmount);

      expect(await event.betAmount(1, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(1, user2.address)).to.equal(0);
      expect(await event.betAmount(1, user3.address)).to.equal(0);

      expect(await event.betAmount(2, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(2, user2.address)).to.equal(0);
      expect(await event.betAmount(2, user3.address)).to.equal(0);

      expect(await event.betAmount(3, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(3, user2.address)).to.equal(0);
      expect(await event.betAmount(3, user3.address)).to.equal(0);
    });
    it('place 3 bets successfully - different user / same pool', async () => {
      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user2).placeBet(1, betAmount, partnerID);
      await event.connect(user3).placeBet(1, betAmount, partnerID);

      let countBettorsPerPool1 = await event.countBettorsPerPool(1);
      expect(countBettorsPerPool1).to.equal(3);
      let listBettorsPerPool1 = await event.listBettorsPerPool(0, countBettorsPerPool1, 1);
      expect(listBettorsPerPool1.length).to.equal(3);
      expect(listBettorsPerPool1[0]).to.equal(user1.address);
      expect(listBettorsPerPool1[1]).to.equal(user2.address);
      expect(listBettorsPerPool1[2]).to.equal(user3.address);

      let countBettorsPerPool2 = await event.countBettorsPerPool(2);
      expect(countBettorsPerPool2).to.equal(0);
      let listBettorsPerPool2 = await event.listBettorsPerPool(0, countBettorsPerPool2, 2);
      expect(listBettorsPerPool2.length).to.equal(0);

      let countBettorsPerPool3 = await event.countBettorsPerPool(3);
      expect(countBettorsPerPool3).to.equal(0);
      let listBettorsPerPool3 = await event.listBettorsPerPool(0, countBettorsPerPool3, 3);
      expect(listBettorsPerPool3.length).to.equal(0);

      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);

      let countPartnerIDs2 = await event.countPartnerIDs(user2.address);
      expect(countPartnerIDs2).to.equal(1);
      let listPartnerIDs2 = await event.listPartnerIDs(0, countPartnerIDs2, user2.address);
      expect(listPartnerIDs2.length).to.equal(1);
      expect(listPartnerIDs2[0]).to.equal(partnerID);

      let countPartnerIDs3 = await event.countPartnerIDs(user3.address);
      expect(countPartnerIDs3).to.equal(1);
      let listPartnerIDs3 = await event.listPartnerIDs(0, countPartnerIDs3, user3.address);
      expect(listPartnerIDs3.length).to.equal(1);
      expect(listPartnerIDs3[0]).to.equal(partnerID);

      expect(await event.treasury(1)).to.equal(toBN(betAmount).times(3));
      expect(await event.treasury(2)).to.equal(0);
      expect(await event.treasury(3)).to.equal(0);

      expect(await event.betAmount(1, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(1, user2.address)).to.equal(betAmount);
      expect(await event.betAmount(1, user3.address)).to.equal(betAmount);

      expect(await event.betAmount(2, user1.address)).to.equal(0);
      expect(await event.betAmount(2, user2.address)).to.equal(0);
      expect(await event.betAmount(2, user3.address)).to.equal(0);

      expect(await event.betAmount(3, user1.address)).to.equal(0);
      expect(await event.betAmount(3, user2.address)).to.equal(0);
      expect(await event.betAmount(3, user3.address)).to.equal(0);
    });
    it('place 3 bets successfully - different user / different pool', async () => {
      await event.connect(user1).placeBet(1, betAmount, partnerID);
      await event.connect(user2).placeBet(2, betAmount, partnerID);
      await event.connect(user3).placeBet(3, betAmount, partnerID);

      let countBettorsPerPool1 = await event.countBettorsPerPool(1);
      expect(countBettorsPerPool1).to.equal(1);
      let listBettorsPerPool1 = await event.listBettorsPerPool(0, countBettorsPerPool1, 1);
      expect(listBettorsPerPool1.length).to.equal(1);
      expect(listBettorsPerPool1[0]).to.equal(user1.address);

      let countBettorsPerPool2 = await event.countBettorsPerPool(2);
      expect(countBettorsPerPool2).to.equal(1);
      let listBettorsPerPool2 = await event.listBettorsPerPool(0, countBettorsPerPool2, 2);
      expect(listBettorsPerPool2.length).to.equal(1);
      expect(listBettorsPerPool2[0]).to.equal(user2.address);

      let countBettorsPerPool3 = await event.countBettorsPerPool(3);
      expect(countBettorsPerPool3).to.equal(1);
      let listBettorsPerPool3 = await event.listBettorsPerPool(0, countBettorsPerPool3, 3);
      expect(listBettorsPerPool3.length).to.equal(1);
      expect(listBettorsPerPool3[0]).to.equal(user3.address);

      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);

      let countPartnerIDs2 = await event.countPartnerIDs(user2.address);
      expect(countPartnerIDs2).to.equal(1);
      let listPartnerIDs2 = await event.listPartnerIDs(0, countPartnerIDs2, user2.address);
      expect(listPartnerIDs2.length).to.equal(1);
      expect(listPartnerIDs2[0]).to.equal(partnerID);

      let countPartnerIDs3 = await event.countPartnerIDs(user3.address);
      expect(countPartnerIDs3).to.equal(1);
      let listPartnerIDs3 = await event.listPartnerIDs(0, countPartnerIDs3, user3.address);
      expect(listPartnerIDs3.length).to.equal(1);
      expect(listPartnerIDs3[0]).to.equal(partnerID);

      expect(await event.treasury(1)).to.equal(betAmount);
      expect(await event.treasury(2)).to.equal(betAmount);
      expect(await event.treasury(3)).to.equal(betAmount);

      expect(await event.betAmount(1, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(1, user2.address)).to.equal(0);
      expect(await event.betAmount(1, user3.address)).to.equal(0);

      expect(await event.betAmount(2, user1.address)).to.equal(0);
      expect(await event.betAmount(2, user2.address)).to.equal(betAmount);
      expect(await event.betAmount(2, user3.address)).to.equal(0);

      expect(await event.betAmount(3, user1.address)).to.equal(0);
      expect(await event.betAmount(3, user2.address)).to.equal(0);
      expect(await event.betAmount(3, user3.address)).to.equal(betAmount);
    });
    it('revert if not existing pool', async () => {
      const reason = 'NotExistingPool';

      await expect(event.connect(user1).placeBet(7, betAmount, partnerID)).to.be.revertedWithCustomError(event, reason);
    });
    it('revert if bet disabled', async () => {
      const reason = 'CannotBet';

      await eventRegistry.connect(admin).disableBet(eventAddress);
      await expect(event.connect(user1).placeBet(1, betAmount, partnerID)).to.be.revertedWithCustomError(event, reason);
    });
    it('revert if bet too low', async () => {
      const reason = 'NotSufficientBetAmount';

      await expect(event.connect(user1).placeBet(1, toWei('1'), partnerID)).to.be.revertedWithCustomError(
        event,
        reason,
      );
    });
    it('emit BetPlaced event', async () => {
      await expect(event.connect(user1).placeBet(1, betAmount, partnerID))
        .to.emit(event, 'BetPlaced')
        .withArgs(1, user1.address, betAmount, partnerID);
    });
  });
  describe('calculateGain', async () => {
    it('calculate actual gain correctly - based on requirement exemple', async () => {
      await event.connect(user1).placeBet(1, toWei('10'), partnerID);
      await event.connect(user1).placeBet(1, toWei('20'), partnerID);
      await event.connect(user2).placeBet(1, toWei('5'), partnerID);
      await event.connect(user3).placeBet(1, toWei('30'), partnerID);
      await event.connect(user4).placeBet(1, toWei('25'), partnerID);
      await event.connect(user4).placeBet(1, toWei('15'), partnerID);
      await event.connect(user5).placeBet(2, toWei('50'), partnerID);
      await event.connect(user6).placeBet(2, toWei('70'), partnerID);

      expect(await event.potentialGain(1, user1.address)).to.equal(toWei('60.857142857142857142'));
      expect(await event.potentialGain(1, user2.address)).to.equal(toWei('10.142857142857142857'));
      expect(await event.potentialGain(1, user3.address)).to.equal(toWei('60.857142857142857142'));
      expect(await event.potentialGain(1, user4.address)).to.equal(toWei('81.142857142857142857'));
      expect(await event.potentialGain(1, user5.address)).to.equal(toWei('0'));
      expect(await event.potentialGain(1, user6.address)).to.equal(toWei('0'));

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceU3Before = await usdt.balanceOf(user3.address);
      const balanceU4Before = await usdt.balanceOf(user4.address);
      const balanceU5Before = await usdt.balanceOf(user5.address);
      const balanceU6Before = await usdt.balanceOf(user6.address);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();
      await event.connect(user3).withdraw();
      await event.connect(user4).withdraw();
      await event.connect(user5).withdraw();
      await event.connect(user6).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceU3After = await usdt.balanceOf(user3.address);
      const balanceU4After = await usdt.balanceOf(user4.address);
      const balanceU5After = await usdt.balanceOf(user5.address);
      const balanceU6After = await usdt.balanceOf(user6.address);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(toWei('60.857142857142857142'));
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(toWei('10.142857142857142857'));
      expect(toBN(balanceU3After).minus(balanceU3Before)).to.equal(toWei('60.857142857142857142'));
      expect(toBN(balanceU4After).minus(balanceU4Before)).to.equal(toWei('81.142857142857142857'));
      expect(toBN(balanceU5After).minus(balanceU5Before)).to.equal(0);
      expect(toBN(balanceU6After).minus(balanceU6Before)).to.equal(0);
    });
  });
  describe('poolShare', async () => {
    const betAmount1 = toWei('20');
    const betAmount2 = toWei('60');
    it('calculate pool share correctly', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);

      expect(await event.poolShare(0)).to.equal(0);
      expect(await event.poolShare(1)).to.equal(100);
      expect(await event.poolShare(2)).to.equal(0);

      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      expect(await event.poolShare(0)).to.equal(0);
      expect(await event.poolShare(1)).to.equal(25);
      expect(await event.poolShare(2)).to.equal(75);
    });
  });
  describe('event closure', async () => {
    const betAmount1 = toWei('20');
    const betAmount2 = toWei('40');
    it('cancel event - one pool only', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      expect(await event.gameResult()).to.equal(RESULT.NULL);
    });
    it('cancel event - several pools', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      expect(await event.gameResult()).to.equal(RESULT.NULL);
    });
    it('end event : draw - one pool only', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 0);

      expect(await event.gameResult()).to.equal(RESULT.NULL);
    });
    it('end event : draw - winner pool empty', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);
      const balanceOBefore = await usdt.balanceOf(owner.address);

      await eventRegistry.connect(admin).endEvent(eventAddress, 0);

      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);
      const balanceOAfter = await usdt.balanceOf(owner.address);

      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
      expect(toBN(balanceOAfter).minus(balanceOBefore)).to.equal(toBN(betAmount1).plus(betAmount2));

      expect(await event.gameResult()).to.equal(RESULT.NONE);
    });
    it('end event : draw - several pools', async () => {
      await event.connect(user1).placeBet(0, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);
      const balanceOBefore = await usdt.balanceOf(owner.address);

      await eventRegistry.connect(admin).endEvent(eventAddress, 0);

      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);
      const balanceOAfter = await usdt.balanceOf(owner.address);

      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount2).times(10).div(100));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
      expect(toBN(balanceOAfter).minus(balanceOBefore)).to.equal(toBN(betAmount2).times(10).div(100));

      expect(await event.gameResult()).to.equal(RESULT.WIN);
    });
    it('end event : team - one pool only', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      expect(await event.gameResult()).to.equal(RESULT.NULL);
    });
    it('end event : team - winner pool empty', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);
      const balanceOBefore = await usdt.balanceOf(owner.address);

      await eventRegistry.connect(admin).endEvent(eventAddress, 3);

      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);
      const balanceOAfter = await usdt.balanceOf(owner.address);

      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
      expect(toBN(balanceOAfter).minus(balanceOBefore)).to.equal(toBN(betAmount1).plus(betAmount2));

      expect(await event.gameResult()).to.equal(RESULT.NONE);
    });
    it('end event : team - several pools', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);
      const balanceOBefore = await usdt.balanceOf(owner.address);

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);
      const balanceOAfter = await usdt.balanceOf(owner.address);

      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount2).times(10).div(100));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
      expect(toBN(balanceOAfter).minus(balanceOBefore)).to.equal(toBN(betAmount2).times(10).div(100));

      expect(await event.gameResult()).to.equal(RESULT.WIN);
    });
    it('revert if not EventRegistry', async () => {
      const reason = 'NotEventRegistry';

      await expect(event.connect(admin).closeEvent(RESULT.WIN, 1)).to.be.revertedWithCustomError(event, reason);
    });
    it('revert if not existing pool', async () => {
      const reason = 'NotExistingPool';

      await expect(eventRegistry.connect(admin).endEvent(eventAddress, 27)).to.be.revertedWithCustomError(
        event,
        reason,
      );
    });
    it('revert if deadline passed', async () => {
      const reason = 'DeadlinePassed';

      await increaseTimeTo(
        toBN(creationDate)
          .plus(58 * 7 * 24 * 60 * 60)
          .toString(),
      );

      await expect(eventRegistry.connect(admin).cancelEvent(eventAddress)).to.be.revertedWithCustomError(event, reason);
      await expect(eventRegistry.connect(admin).endEvent(eventAddress, 5)).to.be.revertedWithCustomError(event, reason);
    });
    it('emit CommissionPaid when commission (end WIN none empty)', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      await expect(eventRegistry.connect(admin).endEvent(eventAddress, 1))
        .to.emit(event, 'CommissionPaid')
        .withArgs(toBN(betAmount2).times(10).div(100));
    });
    it('emit TreasuryTransfered when commission (end WIN winner empty)', async () => {
      await event.connect(user1).placeBet(0, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await expect(eventRegistry.connect(admin).endEvent(eventAddress, 2))
        .to.emit(event, 'TreasuryTransfered')
        .withArgs(toBN(betAmount1).plus(betAmount2));
    });
  });
  describe('withdraw', async () => {
    const betAmount1 = toWei('20');
    const betAmount2 = toWei('40');
    it('withdraw when cancel - one pool only', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('withdraw when cancel - several pools', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('withdraw when end : draw - one pool only', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 0);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('revert withdraw when end : draw - winner pool empty', async () => {
      const reason = 'CannotWithdraw';

      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 0);

      await expect(event.connect(user1).withdraw()).to.be.revertedWithCustomError(event, reason);
      await expect(event.connect(user2).withdraw()).to.be.revertedWithCustomError(event, reason);
    });
    it('withdraw when end : draw - several pools', async () => {
      await event.connect(user1).placeBet(0, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 0);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(
        toBN(betAmount1).plus(toBN(betAmount2).times(90).div(100)),
      );
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(0);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(
        toBN(betAmount1).plus(toBN(betAmount2).times(90).div(100)),
      );
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('withdraw when end : team - one pool only', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('revert withdraw when end : team - winner pool empty', async () => {
      const reason = 'CannotWithdraw';

      await event.connect(user1).placeBet(0, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 2);

      await expect(event.connect(user1).withdraw()).to.be.revertedWithCustomError(event, reason);
      await expect(event.connect(user2).withdraw()).to.be.revertedWithCustomError(event, reason);
    });
    it('withdraw when end : team - several pools', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(
        toBN(betAmount1).plus(toBN(betAmount2).times(90).div(100)),
      );
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(0);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(
        toBN(betAmount1).plus(toBN(betAmount2).times(90).div(100)),
      );
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('withdraw nothing when already withdrawn', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(0);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(0);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(0);
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('withdraw when deadline has passed', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      await increaseTimeTo(
        toBN(creationDate)
          .plus(56 * 7 * 24 * 60 * 60)
          .toString(),
      );

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await event.connect(user1).withdraw();
      await event.connect(user2).withdraw();

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('revert when cannot withdraw - bet in progress', async () => {
      const reason = 'CannotWithdraw';

      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await expect(event.connect(user1).withdraw()).to.be.revertedWithCustomError(event, reason);
      await expect(event.connect(user2).withdraw()).to.be.revertedWithCustomError(event, reason);
    });
    it('emit BetRefunded when result = NULL : cancel', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      await expect(event.connect(user1).withdraw())
        .to.emit(event, 'BetRefunded')
        .withArgs(1, user1.address, betAmount1);
      await expect(event.connect(user2).withdraw())
        .to.emit(event, 'BetRefunded')
        .withArgs(1, user2.address, betAmount2);
    });
    it('emit BetRefunded when result = NULL : one pool only', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(1, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 0);

      await expect(event.connect(user1).withdraw())
        .to.emit(event, 'BetRefunded')
        .withArgs(1, user1.address, betAmount1);
      await expect(event.connect(user2).withdraw())
        .to.emit(event, 'BetRefunded')
        .withArgs(1, user2.address, betAmount2);
    });
    it('emit BetRewarded when result = WIN', async () => {
      await event.connect(user1).placeBet(1, betAmount1, partnerID);
      await event.connect(user2).placeBet(2, betAmount2, partnerID);

      await eventRegistry.connect(admin).endEvent(eventAddress, 1);

      await expect(event.connect(user1).withdraw())
        .to.emit(event, 'BetRewarded')
        .withArgs(1, user1.address, toBN(betAmount1).plus(toBN(betAmount2).times(90).div(100)));
    });
  });
  describe('gas cost', async () => {
    const betAmount1 = toWei('20');
    const betAmount2 = toWei('40');
    let tx;
    it('placeBet', async () => {
      tx = await event.connect(user1).placeBet(1, betAmount, partnerID);
      await getCosts(tx);
    });
    describe('withdraw', async () => {
      it('cancel event', async () => {
        await event.connect(user1).placeBet(1, betAmount1, partnerID);
        await event.connect(user2).placeBet(1, betAmount2, partnerID);

        await eventRegistry.connect(admin).cancelEvent(eventAddress);

        tx = await event.connect(user1).withdraw();
        await getCosts(tx);
      });
      it('end DRAW', async () => {
        await event.connect(user1).placeBet(1, betAmount1, partnerID);
        await event.connect(user2).placeBet(1, betAmount2, partnerID);

        await eventRegistry.connect(admin).endEvent(eventAddress, 0);

        tx = await event.connect(user1).withdraw();
        await getCosts(tx);
      });
      it('end WIN : looser team empty', async () => {
        await event.connect(user1).placeBet(1, betAmount1, partnerID);
        await event.connect(user2).placeBet(1, betAmount2, partnerID);

        await eventRegistry.connect(admin).endEvent(eventAddress, 1);

        tx = await event.connect(user1).withdraw();
        await getCosts(tx);
      });
      it('end WIN : none empty', async () => {
        await event.connect(user1).placeBet(1, betAmount1, partnerID);
        await event.connect(user2).placeBet(2, betAmount2, partnerID);

        await eventRegistry.connect(admin).endEvent(eventAddress, 1);

        tx = await event.connect(user1).withdraw();
        await getCosts(tx);
      });
    });
  });
});
