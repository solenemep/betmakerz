const { expect } = require('chai');
const { init } = require('./helpers/init.js');
const { snapshot, restore, toWei, getCosts, toBN } = require('./helpers/utils.js');
const { ADMIN_ROLE, TEAM } = require('./helpers/constants.js');

describe('Event', async () => {
  const args = process.env;

  let usdt, usdtAddress;
  let eventRegistry, eventRegistryAddress;

  let event, eventAddress;

  let owner;
  let user1, user2, user3;
  let admin;

  let timestamp;
  let betAmount, partnerID;

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

    const Event = await ethers.getContractFactory('EventMock');

    let tx = await eventRegistry.connect(admin).createEvent();
    let receipt = await tx.wait();
    eventAddress = receipt.logs[0].args[0];
    event = Event.attach(eventAddress);

    await usdt.connect(owner).transfer(user1.address, toWei('1000'));
    await usdt.connect(owner).transfer(user2.address, toWei('1000'));

    await usdt.connect(user1).approve(eventAddress, toWei('1000'));
    await usdt.connect(user2).approve(eventAddress, toWei('1000'));

    betAmount = toWei('10');
    partnerID = 1;

    await snapshot();
  });

  afterEach('revert', async () => {
    await restore();
  });

  describe('deployment', async () => {
    it('deploy contract successfully', async () => {
      expect(await event.eventRegistry()).to.equal(eventRegistryAddress);

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
        .withArgs(user1.address, TEAM.TEAM_A, betAmount, partnerID);
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
