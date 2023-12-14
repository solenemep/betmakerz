const { expect } = require('chai');
const { init } = require('./helpers/init.js');
const { snapshot, restore, toWei, getCosts, toBN } = require('./helpers/utils.js');
const { ADMIN_ROLE, TEAM, RESULT } = require('./helpers/constants.js');

describe('Event', async () => {
  const args = process.env;

  let usdt, usdtAddress;
  let eventRegistry, eventRegistryAddress;

  let event, eventAddress;

  let owner;
  let user1, user2, user3, user4, user5, user6;
  let admin;

  let timestamp;
  let betAmount, partnerID;

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

    await eventRegistry.connect(owner).grantRole(ADMIN_ROLE, admin.address);

    const Event = await ethers.getContractFactory('Event');

    let tx = await eventRegistry.connect(admin).createEvent();
    let receipt = await tx.wait();
    eventAddress = receipt.logs[0].args[0];
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

    betAmount = toWei('10');
    partnerID = 1;

    await snapshot();
  });

  afterEach('revert', async () => {
    await restore();
  });

  describe('deployment', async () => {
    it('deploy contract successfully', async () => {
      expect(await event.eventRegistryAddress()).to.equal(eventRegistryAddress);

      expect(await eventRegistry.canBet(eventAddress)).to.equal(true);
    });
  });
  describe('placeBet', async () => {
    it('place 1 bet successfully', async () => {
      let countBettorsPerTeamA = await event.countBettorsPerTeam(TEAM.TEAM_A);
      expect(countBettorsPerTeamA).to.equal(0);
      let countBettorsPerTeamB = await event.countBettorsPerTeam(TEAM.TEAM_B);
      expect(countBettorsPerTeamB).to.equal(0);
      let countPartnerIDs = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs).to.equal(0);

      let listBettorsPerTeamA = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_A);
      expect(listBettorsPerTeamA.length).to.equal(0);
      let listBettorsPerTeamB = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_B);
      expect(listBettorsPerTeamB.length).to.equal(0);
      let listPartnerIDs = await event.listPartnerIDs(0, countPartnerIDs, user1.address);
      expect(listPartnerIDs.length).to.equal(0);

      expect(await event.treasury(TEAM.TEAM_A)).to.equal(0);
      expect(await event.treasury(TEAM.TEAM_B)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_A, user1.address)).to.equal(0);

      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID);

      countBettorsPerTeamA = await event.countBettorsPerTeam(TEAM.TEAM_A);
      expect(countBettorsPerTeamA).to.equal(1);
      countBettorsPerTeamB = await event.countBettorsPerTeam(TEAM.TEAM_B);
      expect(countBettorsPerTeamB).to.equal(0);
      countPartnerIDs = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs).to.equal(1);

      listBettorsPerTeamA = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_A);
      expect(listBettorsPerTeamA.length).to.equal(1);
      expect(listBettorsPerTeamA[0]).to.equal(user1.address);
      listBettorsPerTeamB = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_B);
      expect(listBettorsPerTeamB.length).to.equal(0);
      listPartnerIDs = await event.listPartnerIDs(0, countPartnerIDs, user1.address);
      expect(listPartnerIDs.length).to.equal(1);
      expect(listPartnerIDs[0]).to.equal(partnerID);

      expect(await event.treasury(TEAM.TEAM_A)).to.equal(betAmount);
      expect(await event.treasury(TEAM.TEAM_B)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_A, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(TEAM.TEAM_B, user1.address)).to.equal(0);
    });
    it('transfer tokens', async () => {
      expect(await usdt.balanceOf(user1.address)).to.equal(toWei('1000'));
      expect(await usdt.balanceOf(eventAddress)).to.equal(0);

      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID);

      expect(await usdt.balanceOf(user1.address)).to.equal(toBN(toWei('1000')).minus(betAmount));
      expect(await usdt.balanceOf(eventAddress)).to.equal(betAmount);
    });
    it('place 2 bets successfully - same user / same team', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID);
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID);

      let countBettorsPerTeamA = await event.countBettorsPerTeam(TEAM.TEAM_A);
      expect(countBettorsPerTeamA).to.equal(1);
      let countBettorsPerTeamB = await event.countBettorsPerTeam(TEAM.TEAM_B);
      expect(countBettorsPerTeamB).to.equal(0);
      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      let countPartnerIDs2 = await event.countPartnerIDs(user2.address);
      expect(countPartnerIDs2).to.equal(0);

      let listBettorsPerTeamA = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_A);
      expect(listBettorsPerTeamA.length).to.equal(1);
      expect(listBettorsPerTeamA[0]).to.equal(user1.address);
      let listBettorsPerTeamB = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_B);
      expect(listBettorsPerTeamB.length).to.equal(0);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);
      let listPartnerIDs2 = await event.listPartnerIDs(0, countPartnerIDs2, user2.address);
      expect(listPartnerIDs2.length).to.equal(0);

      expect(await event.treasury(TEAM.TEAM_A)).to.equal(toBN(betAmount).times(2));
      expect(await event.treasury(TEAM.TEAM_B)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_A, user1.address)).to.equal(toBN(betAmount).times(2));
      expect(await event.betAmount(TEAM.TEAM_A, user2.address)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_B, user1.address)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_B, user2.address)).to.equal(0);
    });
    it('place 2 bets successfully - same user / different team', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID);
      await event.connect(user1).placeBet(TEAM.TEAM_B, betAmount, partnerID);

      let countBettorsPerTeamA = await event.countBettorsPerTeam(TEAM.TEAM_A);
      expect(countBettorsPerTeamA).to.equal(1);
      let countBettorsPerTeamB = await event.countBettorsPerTeam(TEAM.TEAM_B);
      expect(countBettorsPerTeamB).to.equal(1);
      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      let countPartnerIDs2 = await event.countPartnerIDs(user2.address);
      expect(countPartnerIDs2).to.equal(0);

      let listBettorsPerTeamA = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_A);
      expect(listBettorsPerTeamA.length).to.equal(1);
      expect(listBettorsPerTeamA[0]).to.equal(user1.address);
      let listBettorsPerTeamB = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_B);
      expect(listBettorsPerTeamB.length).to.equal(1);
      expect(listBettorsPerTeamB[0]).to.equal(user1.address);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);
      let listPartnerIDs2 = await event.listPartnerIDs(0, countPartnerIDs2, user2.address);
      expect(listPartnerIDs2.length).to.equal(0);

      expect(await event.treasury(TEAM.TEAM_A)).to.equal(betAmount);
      expect(await event.treasury(TEAM.TEAM_B)).to.equal(betAmount);
      expect(await event.betAmount(TEAM.TEAM_A, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(TEAM.TEAM_A, user2.address)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_B, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(TEAM.TEAM_B, user2.address)).to.equal(0);
    });
    it('place 2 bets successfully - different user / same team', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, betAmount, partnerID);

      let countBettorsPerTeamA = await event.countBettorsPerTeam(TEAM.TEAM_A);
      expect(countBettorsPerTeamA).to.equal(2);
      let countBettorsPerTeamB = await event.countBettorsPerTeam(TEAM.TEAM_B);
      expect(countBettorsPerTeamB).to.equal(0);
      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      let countPartnerIDs2 = await event.countPartnerIDs(user2.address);
      expect(countPartnerIDs2).to.equal(1);

      let listBettorsPerTeamA = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_A);
      expect(listBettorsPerTeamA.length).to.equal(2);
      expect(listBettorsPerTeamA[0]).to.equal(user1.address);
      expect(listBettorsPerTeamA[1]).to.equal(user2.address);
      let listBettorsPerTeamB = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_B);
      expect(listBettorsPerTeamB.length).to.equal(0);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);
      let listPartnerIDs2 = await event.listPartnerIDs(0, countPartnerIDs2, user2.address);
      expect(listPartnerIDs2.length).to.equal(1);
      expect(listPartnerIDs2[0]).to.equal(partnerID);

      expect(await event.treasury(TEAM.TEAM_A)).to.equal(toBN(betAmount).times(2));
      expect(await event.treasury(TEAM.TEAM_B)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_A, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(TEAM.TEAM_A, user2.address)).to.equal(betAmount);
      expect(await event.betAmount(TEAM.TEAM_B, user1.address)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_B, user2.address)).to.equal(0);
    });
    it('place 2 bets successfully - different user / different team', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_B, betAmount, partnerID);

      let countBettorsPerTeamA = await event.countBettorsPerTeam(TEAM.TEAM_A);
      expect(countBettorsPerTeamA).to.equal(1);
      let countBettorsPerTeamB = await event.countBettorsPerTeam(TEAM.TEAM_B);
      expect(countBettorsPerTeamB).to.equal(1);
      let countPartnerIDs1 = await event.countPartnerIDs(user1.address);
      expect(countPartnerIDs1).to.equal(1);
      let countPartnerIDs2 = await event.countPartnerIDs(user2.address);
      expect(countPartnerIDs2).to.equal(1);

      let listBettorsPerTeamA = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_A);
      expect(listBettorsPerTeamA.length).to.equal(1);
      expect(listBettorsPerTeamA[0]).to.equal(user1.address);
      let listBettorsPerTeamB = await event.listBettorsPerTeam(0, countBettorsPerTeamA, TEAM.TEAM_B);
      expect(listBettorsPerTeamB.length).to.equal(1);
      expect(listBettorsPerTeamB[0]).to.equal(user2.address);
      let listPartnerIDs1 = await event.listPartnerIDs(0, countPartnerIDs1, user1.address);
      expect(listPartnerIDs1.length).to.equal(1);
      expect(listPartnerIDs1[0]).to.equal(partnerID);
      let listPartnerIDs2 = await event.listPartnerIDs(0, countPartnerIDs2, user2.address);
      expect(listPartnerIDs2.length).to.equal(1);
      expect(listPartnerIDs2[0]).to.equal(partnerID);

      expect(await event.treasury(TEAM.TEAM_A)).to.equal(betAmount);
      expect(await event.treasury(TEAM.TEAM_B)).to.equal(betAmount);
      expect(await event.betAmount(TEAM.TEAM_A, user1.address)).to.equal(betAmount);
      expect(await event.betAmount(TEAM.TEAM_A, user2.address)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_B, user1.address)).to.equal(0);
      expect(await event.betAmount(TEAM.TEAM_B, user2.address)).to.equal(betAmount);
    });
    it('revert if bet disabled', async () => {
      const reason = 'CannotBet';

      await eventRegistry.connect(admin).disableBet(eventAddress);
      await expect(event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID)).to.be.revertedWithCustomError(
        event,
        reason,
      );
    });
    it('emit BetPlaced event', async () => {
      await expect(event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID))
        .to.emit(event, 'BetPlaced')
        .withArgs(TEAM.TEAM_A, user1.address, betAmount, partnerID);
    });
  });
  describe('calculateGain', async () => {
    it('calculate actual gain correctly - based on requirement exemple', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, toWei('10'), partnerID);
      await event.connect(user1).placeBet(TEAM.TEAM_A, toWei('20'), partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, toWei('5'), partnerID);
      await event.connect(user3).placeBet(TEAM.TEAM_A, toWei('30'), partnerID);
      await event.connect(user4).placeBet(TEAM.TEAM_A, toWei('25'), partnerID);
      await event.connect(user4).placeBet(TEAM.TEAM_A, toWei('15'), partnerID);
      await event.connect(user5).placeBet(TEAM.TEAM_B, toWei('50'), partnerID);
      await event.connect(user6).placeBet(TEAM.TEAM_B, toWei('70'), partnerID);

      expect(await event.potentialGain(TEAM.TEAM_A, user1.address, 0)).to.equal(toWei('60.857142857142857142'));
      expect(await event.potentialGain(TEAM.TEAM_A, user2.address, 0)).to.equal(toWei('10.142857142857142857'));
      expect(await event.potentialGain(TEAM.TEAM_A, user3.address, 0)).to.equal(toWei('60.857142857142857142'));
      expect(await event.potentialGain(TEAM.TEAM_A, user4.address, 0)).to.equal(toWei('81.142857142857142857'));
      expect(await event.potentialGain(TEAM.TEAM_A, user5.address, 0)).to.equal(toWei('0'));
      expect(await event.potentialGain(TEAM.TEAM_A, user6.address, 0)).to.equal(toWei('0'));

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceU3Before = await usdt.balanceOf(user3.address);
      const balanceU4Before = await usdt.balanceOf(user4.address);
      const balanceU5Before = await usdt.balanceOf(user5.address);
      const balanceU6Before = await usdt.balanceOf(user6.address);

      await eventRegistry.connect(admin).endEvent(eventAddress, RESULT.WIN_A);

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
    it('calculate potential gain correctly - based on requirement exemple', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, toWei('10'), partnerID);
      await event.connect(user1).placeBet(TEAM.TEAM_A, toWei('20'), partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, toWei('5'), partnerID);
      await event.connect(user3).placeBet(TEAM.TEAM_A, toWei('30'), partnerID);
      await event.connect(user4).placeBet(TEAM.TEAM_A, toWei('25'), partnerID);
      await event.connect(user5).placeBet(TEAM.TEAM_B, toWei('50'), partnerID);
      await event.connect(user6).placeBet(TEAM.TEAM_B, toWei('70'), partnerID);

      expect(await event.potentialGain(TEAM.TEAM_A, user4.address, toWei('15'))).to.equal(
        toWei('81.142857142857142857'),
      );
    });
  });
  describe('closeEvent', async () => {
    const betAmount1 = toWei('20');
    const betAmount2 = toWei('40');
    it('cancel : refund both teams - one empty', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, betAmount2, partnerID);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('cancel : refund both teams - none empty', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_B, betAmount2, partnerID);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await eventRegistry.connect(admin).cancelEvent(eventAddress);

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('end NO_WIN : refund both teams - one empty', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, betAmount2, partnerID);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await eventRegistry.connect(admin).endEvent(eventAddress, RESULT.NO_WIN);

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('end NO_WIN : refund both teams - none empty', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_B, betAmount2, partnerID);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await eventRegistry.connect(admin).endEvent(eventAddress, RESULT.NO_WIN);

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('end WIN : refund winner team - looser team empty', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, betAmount2, partnerID);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await eventRegistry.connect(admin).endEvent(eventAddress, RESULT.WIN_A);

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(betAmount1);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(betAmount2);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(0);
    });
    it('end WIN : pays EventRegistry - winner team empty', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, betAmount2, partnerID);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await eventRegistry.connect(admin).endEvent(eventAddress, RESULT.WIN_B);

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(0);
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(0);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(toBN(betAmount1).plus(betAmount2));
    });
    it('end WIN : pays winners bettors + commission - none empty', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_B, betAmount2, partnerID);

      const balanceU1Before = await usdt.balanceOf(user1.address);
      const balanceU2Before = await usdt.balanceOf(user2.address);
      const balanceEBefore = await usdt.balanceOf(eventAddress);
      const balanceERBefore = await usdt.balanceOf(eventRegistryAddress);

      await eventRegistry.connect(admin).endEvent(eventAddress, RESULT.WIN_A);

      const balanceU1After = await usdt.balanceOf(user1.address);
      const balanceU2After = await usdt.balanceOf(user2.address);
      const balanceEAfter = await usdt.balanceOf(eventAddress);
      const balanceERAfter = await usdt.balanceOf(eventRegistryAddress);

      expect(toBN(balanceU1After).minus(balanceU1Before)).to.equal(
        toBN(betAmount1).plus(toBN(betAmount2).times(90).div(100)),
      );
      expect(toBN(balanceU2After).minus(balanceU2Before)).to.equal(0);
      expect(toBN(balanceEBefore).minus(balanceEAfter)).to.equal(toBN(betAmount1).plus(betAmount2));
      expect(toBN(balanceERAfter).minus(balanceERBefore)).to.equal(toBN(betAmount2).times(10).div(100));
    });
    it('revert if not EventRegistry', async () => {
      const reason = 'NotEventRegistry';

      await expect(event.connect(admin).closeEvent(RESULT.WIN_A)).to.be.revertedWithCustomError(event, reason);
    });
    it('emit BetRefunded when refund (cancel)', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, betAmount2, partnerID);

      await expect(eventRegistry.connect(admin).cancelEvent(eventAddress))
        .to.emit(event, 'BetRefunded')
        .withArgs(TEAM.TEAM_A, user1.address, betAmount1)
        .to.emit(event, 'BetRefunded')
        .withArgs(TEAM.TEAM_A, user2.address, betAmount2);
    });
    it('emit BetRefunded when refund (end NO_WIN)', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_B, betAmount2, partnerID);

      await expect(eventRegistry.connect(admin).endEvent(eventAddress, RESULT.NO_WIN))
        .to.emit(event, 'BetRefunded')
        .withArgs(TEAM.TEAM_A, user1.address, betAmount1)
        .to.emit(event, 'BetRefunded')
        .withArgs(TEAM.TEAM_B, user2.address, betAmount2);
    });
    it('emit BetRefunded when refund (end WIN looser empty)', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, betAmount2, partnerID);

      await expect(eventRegistry.connect(admin).endEvent(eventAddress, RESULT.WIN_A))
        .to.emit(event, 'BetRefunded')
        .withArgs(TEAM.TEAM_A, user1.address, betAmount1)
        .to.emit(event, 'BetRefunded')
        .withArgs(TEAM.TEAM_A, user2.address, betAmount2);
    });
    it('emit CommissionPaid when commission (end WIN winner empty)', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_A, betAmount2, partnerID);

      await expect(eventRegistry.connect(admin).endEvent(eventAddress, RESULT.WIN_B))
        .to.emit(event, 'LooserPoolTransfered')
        .withArgs(toBN(betAmount1).plus(betAmount2));
    });
    it('emit BetRewarded when rewarded (end WIN none empty)', async () => {
      await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount1, partnerID);
      await event.connect(user2).placeBet(TEAM.TEAM_B, betAmount2, partnerID);

      await expect(eventRegistry.connect(admin).endEvent(eventAddress, RESULT.WIN_A))
        .to.emit(event, 'BetRewarded')
        .withArgs(TEAM.TEAM_A, user1.address, toBN(betAmount1).plus(toBN(betAmount2).times(90).div(100)))
        .to.emit(event, 'CommissionPaid')
        .withArgs(toBN(betAmount2).times(10).div(100));
    });
  });
  describe('gas cost', async () => {
    let tx;
    it('placeBet', async () => {
      tx = await event.connect(user1).placeBet(TEAM.TEAM_A, betAmount, partnerID);
      await getCosts(tx);
    });
  });
});
