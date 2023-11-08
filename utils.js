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