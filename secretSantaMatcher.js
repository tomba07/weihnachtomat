class SecretSantaMatcher {
  constructor(givers, receivers) {
    const participantsCount = givers.length + receivers.length;

    this.givers = givers;
    this.receivers = receivers;
    this.participantConnections = new Array(participantsCount).fill().map(() => []);
    this.secretSantaPair = new Array(participantsCount).fill(-1);
    this.searchDistance = new Array(participantsCount).fill(-1);
  }

  shuffleParticipantConnections() {
    this.participantConnections.forEach((edges) => {
      shuffleArray(edges);
    });
  }

  addSecretSantaPairing(giver, receiver) {
    if (giver < 0 || giver >= this.participantConnections.length || receiver < 0 || receiver >= this.participantConnections.length) {
      throw new Error("Participant indices are out of bounds.");
    }
    this.participantConnections[giver].push(receiver);
  }

  initializeSearchLayer() {
    this.searchDistance.fill(Infinity);
    let queue = [];

    this.secretSantaPair.forEach((pairedParticipant, participant) => {
      if (pairedParticipant === -1) {
        this.searchDistance[participant] = 0;
        queue.push(participant);
      }
    });

    this.searchDistance[-1] = Infinity;

    while (queue.length > 0) {
      let currentParticipant = queue.shift();
      if (currentParticipant !== -1) {
        this.participantConnections[currentParticipant].forEach((possiblePair) => {
          if (this.searchDistance[this.secretSantaPair[possiblePair]] === Infinity) {
            this.searchDistance[this.secretSantaPair[possiblePair]] = this.searchDistance[currentParticipant] + 1;
            queue.push(this.secretSantaPair[possiblePair]);
          }
        });
      }
    }
    return this.searchDistance[-1] !== Infinity;
  }

  attemptAssignment(participant) {
    if (participant !== -1) {
      return this.participantConnections[participant].some((potentialPair) => {
        if (this.searchDistance[this.secretSantaPair[potentialPair]] === this.searchDistance[participant] + 1) {
          if (this.attemptAssignment(this.secretSantaPair[potentialPair])) {
            this.secretSantaPair[potentialPair] = participant;
            this.secretSantaPair[participant] = potentialPair;
            return true;
          }
        }
      });
    }
    return true;
  }

  generateSecretSantaPairs() {
    const numberOfGivers = this.givers.length;
    let totalPairs = 0;

    this.shuffleParticipantConnections();

    while (this.initializeSearchLayer()) {
      this.secretSantaPair.forEach((pairedParticipant, participant) => {
        if (pairedParticipant === -1 && this.attemptAssignment(participant)) {
          totalPairs++;
        }
      });
    }
    // Retrieve and return the pairs
    const pairs = {};

    for (let i = 0; i < numberOfGivers; i++) {
      if (this.secretSantaPair[i] !== -1) {
        const receiverIndex = this.secretSantaPair[i] - numberOfGivers,
          receiverName = this.receivers[receiverIndex],
          giverName = this.givers[i];

        if (!pairs[giverName]) {
          pairs[giverName] = [];
        }
        pairs[giverName].push(receiverName);
      }
    }
    return pairs;
  }
}