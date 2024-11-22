function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isObjectEmpty(objectName) {
  return Object.keys(objectName).length === 0;
}

function removeAssignmentsFromURL() {
  const url = new URL(window.location);
  url.searchParams.delete("assignments");
  url.searchParams.delete("groupName");
  window.location.href = url;
}

function getParticipantsClone(participants) {
  return participants.map((entry) => {
    return {
      name: entry.name,
      numberOfGifts: entry.numberOfGifts,
      exclusions: entry.exclusions
    };
  });
}

function getGivers(nameInfo) {
  //Return an array of givers. If someone gives x gifts, he will be duplicated x times
  return nameInfo.reduce((prev, curr) => {
    for (let i = 0; i < curr.numberOfGifts; i++) {
      prev.push(curr.name)
    }

    return prev;
  }, [])
}

function getMessagesForConfig(participants) {
  if (participants.length < 3) {
    return;
  }
  const names = participants.map((entry) => entry.name),
    giftsOffered = participants.reduce((sum, entry) => sum + entry.numberOfGifts, 0),
    numberOfParticipants = participants.length;

  let messages = {
    warning: "",
    error: ""
  };

  if (giftsOffered < numberOfParticipants) {
    const giftCountDifference = Math.abs(giftsOffered - numberOfParticipants);

    messages.error = `Error: The total number of gifts (${giftsOffered}) is less than the number of participants (${numberOfParticipants}). Difference: ${giftCountDifference}.`;
  } else {
    const testResult = secretSanta(participants) || {};
    let recipientCount = 0;

    for (let key in testResult) {
      // Add the array length to the counter
      recipientCount += testResult[key].length;
    }

    if (recipientCount < numberOfParticipants) {
      messages.error = "Error: Not everyone will receive a gift with the current configuration. Please check the exclusions.";
    } else {
      // Check for exclusions that only leave one option
      participants.forEach((entry) => {
        if (entry.numberOfGifts > 0 && entry.exclusions.length === names.length - 2) {
          messages.warning = "Warning: Some participants have only one possible match. This can lead to predictable results.";
        }
      });
    }
  }

  return messages;
}

function secretSanta(participants) {
  const numberOfParticipants = participants.length,
    //For some reason, cloning with Alpine JS does not work properly, so using this workaround
    clonedNames = getParticipantsClone(participants),
    shuffledNames = shuffleArray(clonedNames),
    exclusionsByName = participants.reduce((prev, curr) => {
      prev[curr.name] = curr.exclusions;
      return prev;
    }, {});

  let offeredGifts = shuffledNames.reduce((sum, entry) => sum + entry.numberOfGifts, 0);

  // Reduce the numberOfGifts in a fair manner until totalGifts equals numberOfParticipants
  while (offeredGifts > numberOfParticipants) {
    const maxGiftsEntry = shuffledNames.reduce((prev, current) => (prev.numberOfGifts > current.numberOfGifts ? prev : current));

    maxGiftsEntry.numberOfGifts--;
    offeredGifts--;
  }

  const givers = getGivers(shuffledNames),
    receivers = shuffledNames.map(entry => entry.name),
    graph = new SecretSantaMatcher(givers, receivers);

  // Build the graph edges based on exclusions
  givers.forEach((giver, giverIndex) => {
    receivers.forEach((receiver, receiverIndex) => {
      if (giver !== receiver && !exclusionsByName[giver].includes(receiver)) {
        graph.addSecretSantaPairing(giverIndex, numberOfParticipants + receiverIndex);
      }
    });
  });

  return graph.generateSecretSantaPairs();
}