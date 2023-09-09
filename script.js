function nameApp() {
  return {
    nameEntries: [],
    exclusionModalVisible: false,
    availableExclusions: [],
    currentExclusions: [],
    currentNameEntry: null,
    output: "",
    newName: "",

    updateExclusionOptions() {
      this.availableExclusions = this.nameEntries
        .map((entry) => entry.name)
        .filter(Boolean);
    },

    addNewName() {
        if (this.newName && !this.nameEntries.some(entry => entry.name === this.newName)) {
            this.nameEntries.push({ id: Date.now(), name: this.newName, exclusions: [] });
            this.newName = "";
        } else {
            alert("Please enter a unique name.");
        }
    },

    showExclusionModal(nameEntry) {
      this.currentNameEntry = nameEntry;
      this.currentExclusions = [...nameEntry.exclusions];
      this.availableExclusions = this.nameEntries.map((entry) => entry.name).filter((name) => name !== nameEntry.name && Boolean(name));
      this.exclusionModalVisible = true;
    },

    markAsDone(nameEntry) {
      let names = this.nameEntries.map((entry) => entry.name);
      let nameOccurrences = names.filter((name) => name === nameEntry.name).length;

      if (nameOccurrences > 1) {
        alert("This name already exists. Please enter a unique name.");
        return;
      }

      this.addNameInput();
    },

    saveExclusions() {
      this.currentNameEntry.exclusions = [...this.currentExclusions];
      this.exclusionModalVisible = false;
    },

    addNameInput() {
      this.nameEntries.push({ id: Date.now(), name: "", exclusions: [], done: false });
    },

    removeNameInput(nameEntry) {
      const index = this.nameEntries.indexOf(nameEntry);
      if (index > -1) {
        this.nameEntries.splice(index, 1);
      }
      this.updateExclusionOptions();
    },

    removeExclusion(nameEntry, exclusion) {
      const index = nameEntry.exclusions.indexOf(exclusion);
      if (index > -1) {
        nameEntry.exclusions.splice(index, 1);
      }
    },

    assign() {
      let names = this.nameEntries
        .map((entry) => entry.name);
      let exclusions = {};
      this.nameEntries
        .forEach((entry) => {
          exclusions[entry.name] = entry.exclusions;
        });

      let assignments = this.createAssignments(names, exclusions);
      this.output = assignments.join("<br>");
    },

    createAssignments(names, exclusions) {
      let shuffledNames = this.shuffleNames([...names]);
      let assignmentsDict = this.initializeAssignmentsDict(shuffledNames);
      let recipients = this.assignGifts(shuffledNames, exclusions, assignmentsDict);
      let leftOutPeople = this.getLeftOutPeople(shuffledNames, recipients);
      this.assignLeftOutPeople(leftOutPeople, shuffledNames, exclusions, assignmentsDict);
      return this.formatAssignments(assignmentsDict);
    },

    shuffleNames(names) {
      return names.sort(() => Math.random() - 0.5);
    },

    initializeAssignmentsDict(names) {
      let dict = {};
      names.forEach((name) => (dict[name] = []));
      return dict;
    },

    assignGifts(names, exclusions, assignmentsDict) {
      let recipients = new Set();
      for (let i = 0; i < names.length; i++) {
        let currentName = names[i];
        let nextIndex = (i + 1) % names.length;
        let matchedName = names[nextIndex];
        let attempts = 0;

        while (currentName === matchedName || (exclusions[currentName] && exclusions[currentName].includes(matchedName))) {
          nextIndex = (nextIndex + 1) % names.length;
          matchedName = names[nextIndex];
          attempts++;

          if (attempts >= names.length) {
            matchedName = "No one";
            break;
          }
        }

        if (matchedName !== "No one") {
          recipients.add(matchedName);
        }
        assignmentsDict[currentName].push(matchedName);
      }
      return recipients;
    },

    getLeftOutPeople(names, recipients) {
      return names.filter((name) => !recipients.has(name));
    },

    assignLeftOutPeople(leftOutPeople, names, exclusions, assignmentsDict) {
      let potentialGifters = names.filter((name) => name !== "No one");
      potentialGifters.sort(() => Math.random() - 0.5);

      leftOutPeople.forEach((person) => {
        let triedGifters = new Set();
        let gifterIndex = Math.floor(Math.random() * potentialGifters.length);
        let gifter = potentialGifters[gifterIndex];

        while (gifter === person || (exclusions[gifter] && exclusions[gifter].includes(person)) || triedGifters.has(gifter)) {
          triedGifters.add(gifter);

          if (triedGifters.size >= potentialGifters.length) {
            gifter = "No one";
            break;
          }

          gifterIndex = (gifterIndex + 1) % potentialGifters.length;
          gifter = potentialGifters[gifterIndex];
        }

        if (!assignmentsDict[gifter]) {
          assignmentsDict[gifter] = [];
        }
        assignmentsDict[gifter].push(person);
      });
    },

    formatAssignments(assignmentsDict) {
      let assignmentsList = [];
      for (let gifter in assignmentsDict) {
        assignmentsList.push(gifter + " -> " + assignmentsDict[gifter].join(", "));
      }
      return assignmentsList;
    }
  };
}
