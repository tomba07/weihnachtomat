function nameApp() {
  return {
    nameEntries: [],
    exclusionModalVisible: false,
    availableExclusions: [],
    currentExclusions: [],
    currentNameEntry: null,
    output: "",
    newName: "",

    init() {
      document.addEventListener("keydown", this.closeOnEscape.bind(this));
      this.$refs.nameInput.focus();
    },

    closeOnEscape(event) {
      if (event.key === "Escape" || event.keyCode === 27) {
        this.exclusionModalVisible = false;
      }
    },

    updateExclusionOptions() {
      this.availableExclusions = this.nameEntries.map((entry) => entry.name).filter(Boolean);
    },

    addNewName() {
      if (this.newName && !this.nameEntries.some((entry) => entry.name === this.newName)) {
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
      let names = this.nameEntries.map((entry) => entry.name);
      let exclusions = {};
      this.nameEntries.forEach((entry) => {
        exclusions[entry.name] = entry.exclusions;
      });

      let assignments = this.createAssignments(names, exclusions);
      this.output = assignments.join("<br>");
    },

    createAssignments(names, exclusions) {
      let shuffledNames = this.shuffleNames([...names]);
      let assignmentsDict = this.assignGifts(shuffledNames, exclusions);

      return this.formatAssignments(assignmentsDict);
    },

    shuffleNames(names) {
      return names.sort(() => Math.random() - 0.5);
    },

    assignGifts(names, exclusions) {
      const assignmentsDict = names.reduce((acc, curr) => {
        acc[curr] = [];
        return acc;
      }, {});
      //track gifters assignment count
      const recipientCountByGifter = names.reduce((acc, curr) => {
        acc[curr] = 0;
        return acc;
      }, {});

      names.forEach((recipientName) => {
        //ignore exclusions, self and 'overachieving gifters'
        let potentialGifters = names.filter((gifterName) => gifterName !== recipientName && (!exclusions[gifterName] || !exclusions[gifterName].includes(recipientName)));
        const lowestPotentialGiftersAssignmentCount = Math.min(...potentialGifters.map((gifterName) => recipientCountByGifter[gifterName]));
        //because of exclusions, sometimes people have to gift more than one person. It should however be evenly distributed.
        potentialGifters = potentialGifters.filter((gifterName) => recipientCountByGifter[gifterName] === lowestPotentialGiftersAssignmentCount);

        let gifter = potentialGifters[Math.floor(Math.random() * potentialGifters.length)];

        if (!gifter) {
          const noGifter = "No one";

          assignmentsDict[noGifter] = [];
          gifter = noGifter;
        }
        assignmentsDict[gifter].push(recipientName);
        recipientCountByGifter[gifter] = recipientCountByGifter[gifter] ? recipientCountByGifter[gifter] + 1 : 1;
      });

      return assignmentsDict;
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
